import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcrypt";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";
import { PrismaService } from "src/prisma/prisma.service";
import { UserAuth, userAuthSelect, UserPublic, userPublicSelect } from "src/prisma/selects";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
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

  async checkEmailOrUsername(field: "email" | "username", value: string): Promise<{ available: boolean }> {
    const where = field === "email" ? { email: value } : { username: value };
    const exists = await this.prisma.user.findUnique({ where, select: { id: true } });
    return { available: !exists };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    const user = await this.findOne(id);

    const data: Prisma.UserUpdateInput = { ...dto };

    if (dto.password) {
      data.password_hash = await hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      select: userPublicSelect,
    });

    await Promise.all([
      this.cache.del(CacheKeys.user(id)),
      this.cache.del(CacheKeys.userByIdentifier(user.email)),
      this.cache.del(CacheKeys.userByIdentifier(user.username)),
    ]);

    return updated;
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