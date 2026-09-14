import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma, WorkspaceRoleEnum } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { UserDataExport } from "@crwsync/types";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { ChangePasswordDto } from "src/user/dto/change-password.dto";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";
import { PrismaService } from "src/prisma/prisma.service";
import { UserAuth, userAuthSelect, UserPublic, userPublicSelect } from "src/prisma/selects";
import { VerificationService } from "src/email-verification/email-verification.service";
import { SessionService } from "src/session/session.service";
import { StorageService } from "src/storage/storage.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly verificationService: VerificationService,
    private readonly sessionService: SessionService,
    private readonly storageService: StorageService,
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

    const { birthdate, email, username, firstname, lastname, avatar_key } = dto;

    if (avatar_key && !avatar_key.startsWith(`${user.id}_`)) {
      throw new BadRequestException("Invalid avatar key");
    }

    const data: Prisma.UserUpdateInput = {};

    if (username !== undefined) data.username = username;
    if (firstname !== undefined) data.firstname = firstname;
    if (lastname !== undefined) data.lastname = lastname;
    if (avatar_key !== undefined) data.avatar_key = avatar_key;
    if (birthdate !== undefined) data.birthdate = new Date(`${birthdate}T00:00:00.000Z`);

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

    if (avatar_key !== undefined && avatar_key !== user.avatar_key && user.avatar_key) {
      await this.storageService.deleteObject(user.avatar_key);
    }

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

  async changePassword(id: string, dto: ChangePasswordDto, currentSessionId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userAuthSelect });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const valid = await compare(dto.currentPassword, user.password_hash);
    if (!valid) {
      throw new BadRequestException("Current password is incorrect");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        password_hash: await hash(dto.newPassword, 10),
        last_password_change: new Date(),
      },
    });

    await Promise.all([
      this.cache.del(CacheKeys.user(id)),
      this.cache.del(CacheKeys.userByIdentifier(user.email)),
      this.cache.del(CacheKeys.userByIdentifier(user.username)),
    ]);

    await this.sessionService.revokeAll(id, currentSessionId);
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

  async exportData(id: string): Promise<UserDataExport> {
    const [profile, memberships, tasksCreated, tasksAssigned, comments, chatMessages, checklistItems] = await Promise.all([
      this.findOne(id),
      this.prisma.workspaceMember.findMany({
        where: { user_id: id },
        select: { role: true, joined_at: true, workspace: { select: { name: true, slug: true } } },
      }),
      this.prisma.task.findMany({
        where: { created_by: id },
        select: { shortId: true, title: true, priority: true, created_at: true, workspace: { select: { name: true } } },
      }),
      this.prisma.task.findMany({
        where: { assignee_id: id },
        select: { shortId: true, title: true, priority: true, workspace: { select: { name: true } } },
      }),
      this.prisma.taskComment.findMany({
        where: { author_id: id },
        select: { content: true, created_at: true, task: { select: { shortId: true, title: true } } },
      }),
      this.prisma.chatMessage.findMany({
        where: { sender_id: id },
        select: { content: true, created_at: true, room: { select: { name: true } } },
      }),
      this.prisma.taskChecklistItem.findMany({
        where: { created_by: id },
        select: { content: true, is_completed: true, created_at: true, task: { select: { shortId: true, title: true } } },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        firstname: profile.firstname,
        lastname: profile.lastname,
        birthdate: profile.birthdate.toISOString(),
        created_at: profile.created_at.toISOString(),
      },
      workspaces: memberships.map((m) => ({
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        joined_at: m.joined_at.toISOString(),
      })),
      tasksCreated: tasksCreated.map((t) => ({
        shortId: t.shortId,
        title: t.title,
        priority: t.priority,
        workspace: t.workspace.name,
        created_at: t.created_at.toISOString(),
      })),
      tasksAssigned: tasksAssigned.map((t) => ({
        shortId: t.shortId,
        title: t.title,
        priority: t.priority,
        workspace: t.workspace.name,
      })),
      comments: comments.map((c) => ({
        content: c.content,
        task: `${c.task.shortId} - ${c.task.title}`,
        created_at: c.created_at.toISOString(),
      })),
      chatMessages: chatMessages.map((m) => ({
        content: m.content,
        room: m.room.name,
        created_at: m.created_at.toISOString(),
      })),
      checklistItems: checklistItems.map((i) => ({
        content: i.content,
        isCompleted: i.is_completed,
        task: `${i.task.shortId} - ${i.task.title}`,
        created_at: i.created_at.toISOString(),
      })),
    };
  }

  async closeAccount(id: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { ...userAuthSelect, avatar_key: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      throw new BadRequestException("Password is incorrect");
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { user_id: id },
      select: {
        id: true,
        role: true,
        workspace_id: true,
        workspace: { select: { name: true, slug: true, _count: { select: { members: true } } } },
      },
    });

    const blockers = memberships.filter((m) => m.role === WorkspaceRoleEnum.OWNER && m.workspace._count.members > 1);
    if (blockers.length > 0) {
      throw new BadRequestException(
        `Transfer ownership or delete these workspaces before closing your account: ${blockers.map((b) => b.workspace.name).join(", ")}`,
      );
    }

    const soloOwnerWorkspaceIds = memberships
      .filter((m) => m.role === WorkspaceRoleEnum.OWNER)
      .map((m) => m.workspace_id);
    const membershipsToLeave = memberships.filter((m) => !soloOwnerWorkspaceIds.includes(m.workspace_id));

    const anonymizedEmail = `deleted+${id}@crwsync.invalid`;
    const anonymizedUsername = `deleted-${id}`;

    await this.prisma.$transaction(async (tx) => {
      if (soloOwnerWorkspaceIds.length > 0) {
        await tx.workspace.deleteMany({ where: { id: { in: soloOwnerWorkspaceIds } } });
      }

      if (membershipsToLeave.length > 0) {
        await tx.workspaceMember.deleteMany({ where: { id: { in: membershipsToLeave.map((m) => m.id) } } });
      }

      await tx.user.update({
        where: { id },
        data: {
          email: anonymizedEmail,
          username: anonymizedUsername,
          firstname: "Deleted",
          lastname: "User",
          avatar_key: null,
          password_hash: await hash(randomUUID(), 10),
        },
      });

      await tx.emailVerification.deleteMany({ where: { user_id: id } });
      await tx.passwordReset.deleteMany({ where: { user_id: id } });
    });

    if (user.avatar_key) {
      await this.storageService.deleteObject(user.avatar_key);
    }

    await this.sessionService.revokeAll(id);

    const affectedWorkspaces = memberships.map((m) => ({ id: m.workspace_id, slug: m.workspace.slug }));
    await Promise.all([
      this.cache.del(CacheKeys.user(id)),
      this.cache.del(CacheKeys.userByIdentifier(user.email)),
      this.cache.del(CacheKeys.userByIdentifier(user.username)),
      this.cache.del(CacheKeys.userWorkspaces(id)),
      ...affectedWorkspaces.flatMap((w) => [
        this.cache.del(CacheKeys.workspaceMember(w.id, id)),
        this.cache.del(CacheKeys.workspace(w.id)),
        this.cache.del(CacheKeys.workspaceSlug(w.slug)),
      ]),
    ]);
  }
}