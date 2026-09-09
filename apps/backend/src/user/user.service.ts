import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcrypt";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";
import { PrismaService } from "src/prisma/prisma.service";
import { UserAuth, userAuthSelect, UserPublic, userPublicSelect } from "src/prisma/selects";
import { VerificationService } from "src/email-verification/email-verification.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly verificationService: VerificationService,
  ) {}


  async create(dto: CreateUserDto): Promise<UserPublic> {
    const data = {
      email: dto.email,
      username: dto.username,
      firstname: dto.firstname,
      lastname: dto.lastname,
      birthdate: new Date(`${dto.birthdate}T00:00:00.000Z`),
      password_hash: await hash(dto.password, 10),
    } as Prisma.UserCreateInput;

    return this.prisma.user.create({ data, select: userPublicSelect });
  }

  findAll(): Promise<UserPublic[]> {
    return this.prisma.user.findMany({ select: userPublicSelect });
  }

  async findOne(id: string): Promise<UserPublic> {
    const cacheKey = CacheKeys.user(id);

    const cached = await this.cache.get<UserPublic>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id }, select: userPublicSelect });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.cache.set(cacheKey, user, CacheTTL.USER);

    return user;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserAuth | null> {
    const cacheKey = CacheKeys.userByIdentifier(identifier);

    const cached = await this.cache.get<UserAuth>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      select: userAuthSelect,
    });

    if (user) {
      await this.cache.set(cacheKey, user, CacheTTL.USER);
    }

    return user;
  }

  async searchByEmailOrUsername(identifier: string, workspaceId?: string): Promise<UserPublic[]> {
    const where: Prisma.UserWhereInput = {
      OR: [{ email: { contains: identifier } }, { username: { contains: identifier } }],
    };

    if (workspaceId) {
      where.NOT = {
        OR: [
          { ws_memberships: { some: { workspace_id: workspaceId } } },
          { ws_received_invites: { some: { workspace_id: workspaceId, status: "pending" } } },
        ],
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: userPublicSelect,
      take: 5,
    });

    return users;
  }

  async checkEmailOrUsername(field: "email" | "username", value: string): Promise<{ available: boolean }> {
    const where = field === "email" ? { email: value } : { username: value };
    const exists = await this.prisma.user.findUnique({ where, select: { id: true } });
    return { available: !exists };
  }

  async recordLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { last_login: new Date() },
    });
    await this.cache.del(CacheKeys.user(userId));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    const user = await this.findOne(id);

    const { password, birthdate, email, username, firstname, lastname, avatar_key } = dto;

    const data: Prisma.UserUpdateInput = {};

    if (username !== undefined) data.username = username;
    if (firstname !== undefined) data.firstname = firstname;
    if (lastname !== undefined) data.lastname = lastname;
    if (avatar_key !== undefined) data.avatar_key = avatar_key;
    if (birthdate !== undefined) data.birthdate = new Date(`${birthdate}T00:00:00.000Z`);

    if (password) {
      data.password_hash = await hash(password, 10);
      data.last_password_change = new Date();
    }

    let emailChanged = false;
    if (email !== undefined && email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email, NOT: { id: user.id } },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException(`Email ${email} is already in use`);
      }
      data.email = email;
      data.email_verified_at = null;
      emailChanged = true;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      select: userPublicSelect,
    });

    if (emailChanged && email) {
      await this.prisma.emailVerification.deleteMany({
        where: { user_id: user.id },
      });
      await this.verificationService.create({
        user_id: user.id,
        email,
      });
    }

    await Promise.all([
      this.cache.del(CacheKeys.user(id)),
      this.cache.del(CacheKeys.userByIdentifier(user.email)),
      this.cache.del(CacheKeys.userByIdentifier(user.username)),
      ...(email && email !== user.email ? [this.cache.del(CacheKeys.userByIdentifier(email))] : []),
      ...(username && username !== user.username ? [this.cache.del(CacheKeys.userByIdentifier(username))] : []),
    ]);

    return updated;
  }


  async findInvites(userId: string) {
    return this.prisma.workspaceInvite.findMany({
      where: { invitee_id: userId, status: "pending" },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        creator: { select: { id: true, username: true, firstname: true, lastname: true, avatar_key: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.prisma.user.delete({ where: { id: user.id } });

    await Promise.all([
      this.cache.del(CacheKeys.user(id)),
      this.cache.del(CacheKeys.userByIdentifier(user.email)),
      this.cache.del(CacheKeys.userByIdentifier(user.username)),
    ]);
  }
}