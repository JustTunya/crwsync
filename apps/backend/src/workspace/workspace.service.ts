import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { WorkspaceRoleEnum } from "@prisma/client";
import {
  WorkspaceInviteStatusEnum,
  PresignedAvatarUpload,
  WorkspaceHomeData,
  HomeMemberPresence,
  HomeTaskItem,
  HomeProjectSummary,
  HomePinnedModule,
  HomeActivityItem,
} from "@crwsync/types";
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto } from "src/workspace/dto/workspace.dto";
import { CreateTaskAttachmentDto } from "src/workspace/dto/task-attachment.dto";
import { CreateTaskCommentDto, UpdateTaskCommentDto } from "src/workspace/dto/task-comment.dto";
import { CreateTaskChecklistItemDto, UpdateTaskChecklistItemDto } from "src/workspace/dto/task-checklist.dto";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";
import { NotificationService } from "src/notification/notification.service";

const COMMENT_AUTHOR_SELECT = { id: true, firstname: true, lastname: true, avatar_key: true };

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private statusGateway: StatusGateway,
    private storageService: StorageService,
    private notificationService: NotificationService,
  ) {}

  private async invMembershipCaches(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });

    await Promise.all([
      this.cache.del(CacheKeys.workspaceMember(workspaceId, userId)),
      this.cache.del(CacheKeys.userWorkspaces(userId)),
      this.cache.del(CacheKeys.workspace(workspaceId)),
      ...(workspace?.slug ? [this.cache.del(CacheKeys.workspaceSlug(workspace.slug))] : []),
      this.invalidateWorkspaceHome(workspaceId),
    ]);
  }

  async invalidateWorkspaceHome(workspaceId: string) {
    await this.cache.invalidatePattern(CacheKeys.workspaceHomePattern(workspaceId));
  }

  private generateWorkspaceKey(name: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    const words = sanitized.split(/\s+/).filter(w => w.length > 0);
    let key = "";

    if (words.length > 1) {
      const wordCount = Math.min(words.length, 4);
      for (let i = 0; i < wordCount; i++) {
        key += words[i][0];
      }
    } else if (words.length === 1) {
      const word = words[0];
      const consonants = word.match(/[^aeiouAEIOU\W0-9]/g);
      if (consonants && consonants.length >= 3) {
        key = consonants.slice(0, 3).join("");
      } else {
        key = word.slice(0, 3);
      }
    }

    return key.toUpperCase() || "WS";
  }

  async getMembers(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar_key: true,
            email: true,
          },
        },
      },
    });

    const rolePriority: Record<WorkspaceRoleEnum, number> = {
      [WorkspaceRoleEnum.OWNER]: 0,
      [WorkspaceRoleEnum.ADMIN]: 1,
      [WorkspaceRoleEnum.MEMBER]: 2,
      [WorkspaceRoleEnum.GUEST]: 3,
    };

    return members.sort((a, b) => {
      const roleDiff = rolePriority[a.role] - rolePriority[b.role];
      if (roleDiff !== 0) return roleDiff;
      
      const nameA = `${a.user.firstname} ${a.user.lastname}`.toLowerCase();
      const nameB = `${b.user.firstname} ${b.user.lastname}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    let slug = dto.slug;
    if (!slug) {
      slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const existing = await this.prisma.workspace.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
      }
    } else {
        const existing = await this.prisma.workspace.findUnique({ where: { slug } });
        if (existing) throw new BadRequestException("Workspace slug already taken");
    }

    const baseKey = this.generateWorkspaceKey(dto.name);
    let workspaceKey = baseKey;
    let keyCounter = 1;
    while (await this.prisma.workspace.findUnique({ where: { workspaceKey } })) {
      workspaceKey = `${baseKey}${keyCounter}`;
      keyCounter++;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.name, slug, workspaceKey },
      });

      await tx.workspaceMember.create({
        data: {
          user_id: userId,
          workspace_id: workspace.id,
          role: WorkspaceRoleEnum.OWNER,
        },
      });

      return workspace;
    });

    await this.cache.del(CacheKeys.userWorkspaces(userId));

    return result;
  }

  async findAllUserWorkspaces(userId: string) {
    const cacheKey = CacheKeys.userWorkspaces(userId);

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.workspaceMember.findMany({
      where: { user_id: userId },
      include: { workspace: true },
    });

    await this.cache.set(cacheKey, result, CacheTTL.USER_WORKSPACES);

    return result;
  }

  async findOne(id: string) {
    const cacheKey = CacheKeys.workspace(id);

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true }
            }
          }
        }
      },
    });

    if (!workspace) throw new NotFoundException("Workspace not found");

    await this.cache.set(cacheKey, workspace, CacheTTL.WORKSPACE);

    return workspace;
  }

  async findBySlug(slug: string) {
    const cacheKey = CacheKeys.workspaceSlug(slug);

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
    });

    if (!workspace) throw new NotFoundException("Workspace not found");

    await this.cache.set(cacheKey, workspace, CacheTTL.WORKSPACE);

    return workspace;
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    if (dto.logo_key && !dto.logo_key.startsWith(`${id}_`)) {
      throw new BadRequestException("Invalid logo key");
    }

    const [existing, members] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id }, select: { slug: true, logo_key: true } }),
      this.prisma.workspaceMember.findMany({
        where: { workspace_id: id },
        select: { user_id: true },
      }),
    ]);

    if (dto.slug && dto.slug !== existing?.slug) {
      const slugTaken = await this.prisma.workspace.findUnique({ where: { slug: dto.slug } });
      if (slugTaken) throw new BadRequestException("Workspace slug already taken");
    }

    const result = await this.prisma.workspace.update({ where: { id }, data: dto });

    if (dto.logo_key !== undefined && dto.logo_key !== existing?.logo_key && existing?.logo_key) {
      await this.storageService.deleteObject(existing.logo_key);
    }

    const cacheKeys = [
      CacheKeys.workspace(id),
      ...(existing?.slug ? [CacheKeys.workspaceSlug(existing.slug)] : []),
      ...members.flatMap((m) => [
        CacheKeys.workspaceMember(id, m.user_id),
        CacheKeys.userWorkspaces(m.user_id),
      ]),
    ];
    await this.cache.del(cacheKeys);

    return result;
  }

  async remove(id: string) {
    const [existing, members] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id }, select: { slug: true } }),
      this.prisma.workspaceMember.findMany({
        where: { workspace_id: id },
        select: { user_id: true },
      }),
    ]);

    const result = await this.prisma.workspace.delete({ where: { id } });

    const cacheKeys = [
      CacheKeys.workspace(id),
      ...(existing?.slug ? [CacheKeys.workspaceSlug(existing.slug)] : []),
      ...members.flatMap((m) => [
        CacheKeys.workspaceMember(id, m.user_id),
        CacheKeys.userWorkspaces(m.user_id),
      ]),
    ];
    await this.cache.del(cacheKeys);

    return result;
  }

  async getPendingInvites(workspaceId: string) {
    return this.prisma.workspaceInvite.findMany({
      where: { workspace_id: workspaceId, status: WorkspaceInviteStatusEnum.PENDING },
      include: {
        invitee: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar_key: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar_key: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async sendInvite(workspaceId: string, creatorId: string, dto: InviteMemberDto) {
    if (await this.prisma.user.findUnique({ where: { id: dto.invitee_id } }) === null) {
      throw new NotFoundException("Invitee user not found");
    }

    const isMember = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: dto.invitee_id } },
    });

    if (isMember) throw new BadRequestException("User is already a member of the workspace");

    const existingInvite = await this.prisma.workspaceInvite.findUnique({
      where: { invitee_id_workspace_id: { invitee_id: dto.invitee_id, workspace_id: workspaceId } },
    });

    if (existingInvite) {
      if (existingInvite.status === WorkspaceInviteStatusEnum.PENDING) {
        throw new BadRequestException("An active invite already exists for this user");
      } else {
        return this.prisma.workspaceInvite.update({
          where: { id: existingInvite.id },
          data: { status: WorkspaceInviteStatusEnum.PENDING, role: dto.role, creator_id: creatorId }
        });
      }
    }

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        invitee_id: dto.invitee_id,
        creator_id: creatorId,
        workspace_id: workspaceId,
        role: dto.role,
      },
      include: {
        workspace: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar_key: true,
          }
        }
      }
    });

    await this.statusGateway.emitInviteReceived(dto.invitee_id, invite);

    return invite;
  }

  async revokeInvite(workspaceId: string, inviteId: string) {
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspace_id: workspaceId, status: WorkspaceInviteStatusEnum.PENDING },
    });

    if (!invite) throw new NotFoundException("No pending invite found for this workspace");

    await this.statusGateway.emitInviteHandled(invite.invitee_id, invite.id, "REVOKED");

    return this.prisma.workspaceInvite.delete({
      where: { id: invite.id },
    });
  }

  async acceptInvite(workspaceId: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { workspace_id: workspaceId, invitee_id: userId, status: WorkspaceInviteStatusEnum.PENDING },
    });

    if (!invite) throw new NotFoundException("No pending invite found for this workspace");

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          user_id: userId,
          workspace_id: workspaceId,
          role: invite.role,
        },
      });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: WorkspaceInviteStatusEnum.ACCEPTED },
      });
    });

    await this.statusGateway.emitInviteHandled(userId, invite.id, WorkspaceInviteStatusEnum.ACCEPTED);

    await this.invMembershipCaches(workspaceId, userId);
  }

  async declineInvite(workspaceId: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { workspace_id: workspaceId, invitee_id: userId, status: WorkspaceInviteStatusEnum.PENDING },
    });

    if (!invite) throw new NotFoundException("No pending invite found for this workspace");

    const result = await this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: WorkspaceInviteStatusEnum.DECLINED },
    });

    await this.statusGateway.emitInviteHandled(userId, invite.id, WorkspaceInviteStatusEnum.DECLINED);

    return result;
  }

  async kickMember(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: memberId } },
    });

    if (!member) throw new NotFoundException("User is not a member of this workspace");

    if (member.role === WorkspaceRoleEnum.OWNER) {
      throw new BadRequestException("Cannot kick the owner of the workspace");
    }

    const result = await this.prisma.workspaceMember.delete({
      where: { id: member.id },
    });

    await this.invMembershipCaches(workspaceId, memberId);

    return result;
  }

  async leaveWorkspace(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
    });

    if (!member) throw new NotFoundException("You are not a member of this workspace");

    if (member.role === WorkspaceRoleEnum.OWNER) {
      throw new BadRequestException("Owners cannot leave the workspace. Please transfer ownership or delete the workspace.");
    }

    const result = await this.prisma.workspaceMember.delete({
      where: { id: member.id },
    });

    await this.invMembershipCaches(workspaceId, userId);

    return result;
  }

  async updateMemberRole(workspaceId: string, memberId: string, newRole: WorkspaceRoleEnum) {
    if (newRole === WorkspaceRoleEnum.OWNER) {
      throw new BadRequestException("Cannot manually assign OWNER role. Use 'Transfer Ownership' instead.");
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: memberId } },
    });

    if (!member) throw new NotFoundException("User is not a member of this workspace");

    if (member.role === WorkspaceRoleEnum.OWNER) {
      throw new BadRequestException("Cannot change the role of the workspace owner");
    }

    const result = await this.prisma.workspaceMember.update({
      where: { id: member.id },
      data: { role: newRole },
    });

    await this.invMembershipCaches(workspaceId, memberId);

    return result;
  }

  async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string) {
    const newOwnerMember = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: newOwnerId } },
    });

    if (!newOwnerMember) throw new NotFoundException("New owner must be a member of the workspace");

    const currentOwnerMember = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: currentOwnerId } },
    });

    if (!currentOwnerMember || currentOwnerMember.role !== WorkspaceRoleEnum.OWNER) {
      throw new BadRequestException("Only the current owner can transfer ownership");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { id: currentOwnerMember.id },
        data: { role: WorkspaceRoleEnum.ADMIN },
      });

      await tx.workspaceMember.update({
        where: { id: newOwnerMember.id },
        data: { role: WorkspaceRoleEnum.OWNER },
      });
    });

    await Promise.all([
      this.invMembershipCaches(workspaceId, currentOwnerId),
      this.invMembershipCaches(workspaceId, newOwnerId),
    ]);
  }

  async getStatistics(workspaceId: string, userId: string, interval?: string) {
    const intervalMap: Record<string, number> = {
      "1w": 7, "2w": 14, "1m": 30, "3m": 90, "6m": 180, "1y": 365,
    };
    const days = intervalMap[interval ?? "1m"] ?? 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Personal Active Workload — tasks assigned to user in ONGOING columns
    const personalWorkload = await this.prisma.task.count({
      where: {
        assignee_id: userId,
        is_deleted: false,
        column: {
          type: "ONGOING",
          board: { workspace_id: workspaceId },
        },
      },
    });

    // 2. Personal Velocity — tasks completed by user within the interval
    const personalVelocity = await this.prisma.task.count({
      where: {
        assignee_id: userId,
        is_deleted: false,
        completed_at: { gte: startDate },
        column: {
          board: { workspace_id: workspaceId },
        },
      },
    });

    // 3. Personal Cycle Time — average seconds from in_progress_at to completed_at
    const cycleTimeResult = await this.prisma.$queryRaw<
      { avg_seconds: number | null }[]
    >`
      SELECT AVG(EXTRACT(EPOCH FROM (t.completed_at - t.in_progress_at))) as avg_seconds
      FROM tasks t
      JOIN board_columns bc ON t.column_id = bc.id
      JOIN boards b ON bc.board_id = b.id
      WHERE b.workspace_id = ${workspaceId}::uuid
        AND t.assignee_id = ${userId}::uuid
        AND t.is_deleted = false
        AND t.completed_at IS NOT NULL
        AND t.in_progress_at IS NOT NULL
        AND t.completed_at >= ${startDate}
        AND EXTRACT(EPOCH FROM (t.completed_at - t.in_progress_at)) >= 5
    `;

    const personalCycleTime = cycleTimeResult[0]?.avg_seconds
      ? Number(cycleTimeResult[0].avg_seconds)
      : null;

    // 4. Workspace Velocity Timeline — completed tasks grouped by date
    const velocityTimeline = await this.prisma.$queryRaw<
      { date: string; count: number }[]
    >`
      SELECT DATE(t.completed_at)::text as date, COUNT(*)::int as count
      FROM tasks t
      JOIN board_columns bc ON t.column_id = bc.id
      JOIN boards b ON bc.board_id = b.id
      WHERE b.workspace_id = ${workspaceId}::uuid
        AND t.is_deleted = false
        AND t.completed_at IS NOT NULL
        AND t.completed_at >= ${startDate}
      GROUP BY DATE(t.completed_at)
      ORDER BY date ASC
    `;

    return {
      personalWorkload,
      personalVelocity,
      personalCycleTime,
      velocityTimeline,
    };
  }

  async getHomeData(workspaceId: string, userId: string): Promise<WorkspaceHomeData> {
    const cacheKey = CacheKeys.workspaceHome(workspaceId, userId);
    const cached = await this.cache.get<WorkspaceHomeData>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
    const velocityWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [members, focusTasks, workspaceTasks, projects, boardModules, pinnedModules, activities, completionVelocity] =
      await Promise.all([
        this.prisma.workspaceMember.findMany({
          where: { workspace_id: workspaceId },
          include: {
            user: {
              select: { id: true, firstname: true, lastname: true, avatar_key: true, status_preference: true },
            },
          },
        }),
        this.prisma.task.findMany({
          where: { workspace_id: workspaceId, assignee_id: userId, is_deleted: false, is_archived: false },
          include: {
            column: {
              select: { id: true, name: true, type: true, color: true, board_id: true, board: { select: { id: true, name: true } } },
            },
            checklistItems: { select: { is_completed: true } },
            _count: { select: { comments: { where: { is_deleted: false } }, attachments: true } },
          },
        }),
        this.prisma.task.findMany({
          where: { workspace_id: workspaceId, is_deleted: false },
          select: {
            id: true,
            column: { select: { type: true, board_id: true } },
            assignee: { select: { id: true, firstname: true, lastname: true, avatar_key: true } },
          },
        }),
        this.prisma.workspaceProject.findMany({
          where: { workspace_id: workspaceId },
          orderBy: { position: "asc" },
        }),
        this.prisma.workspaceModule.findMany({
          where: { workspace_id: workspaceId, type: "BOARD" },
          select: { id: true, project_id: true, reference_id: true },
        }),
        this.getPinnedModules(workspaceId, userId),
        this.prisma.taskActivity.findMany({
          where: { task: { workspace_id: workspaceId } },
          orderBy: { created_at: "desc" },
          take: 15,
          include: {
            actor: { select: { id: true, firstname: true, lastname: true, avatar_key: true } },
            task: { select: { id: true, title: true, column: { select: { board_id: true } } } },
          },
        }),
        this.prisma.task.count({
          where: { workspace_id: workspaceId, assignee_id: userId, completed_at: { gte: velocityWindowStart } },
        }),
      ]);

    const crew: HomeMemberPresence[] = members.map((member) => ({
      id: member.user.id,
      name: `${member.user.firstname} ${member.user.lastname}`,
      role: member.role as unknown as HomeMemberPresence["role"],
      avatarUrl: member.user.avatar_key,
      isOnline: member.user.status_preference === "ONLINE",
      activeStatus: member.user.status_preference,
    }));

    const projectById = new Map(projects.map((project) => [project.id, project]));
    const boardProjectMap = new Map<string, { id: string; name: string }>();
    for (const mod of boardModules) {
      const project = mod.project_id ? projectById.get(mod.project_id) : undefined;
      if (project) boardProjectMap.set(mod.reference_id, { id: project.id, name: project.name });
    }

    const toHomeTaskItem = (task: (typeof focusTasks)[number]): HomeTaskItem => {
      const project = boardProjectMap.get(task.column.board_id);
      return {
        id: task.id,
        shortId: task.shortId,
        title: task.title,
        priority: task.priority as unknown as HomeTaskItem["priority"],
        status: task.column.name,
        columnId: task.column.id,
        boardId: task.column.board_id,
        boardTitle: task.column.board.name,
        projectId: project?.id,
        projectName: project?.name,
        dueDate: task.due_date ? task.due_date.toISOString() : null,
        commentsCount: task._count.comments,
        attachmentsCount: task._count.attachments,
        checklistTotal: task.checklistItems.length,
        checklistCompleted: task.checklistItems.filter((item) => item.is_completed).length,
        columnColor: task.column.color,
        columnType: task.column.type as unknown as HomeTaskItem["columnType"],
        completedAt: task.completed_at ? task.completed_at.toISOString() : null,
      };
    };

    const overdueRaw: typeof focusTasks = [];
    const dueTodayRaw: typeof focusTasks = [];
    const inProgressRaw: typeof focusTasks = [];
    for (const task of focusTasks) {
      if (task.column.type === "COMPLETE" || task.completed_at) continue;
      if (task.due_date && task.due_date < startOfToday) overdueRaw.push(task);
      else if (task.due_date && task.due_date <= endOfToday) dueTodayRaw.push(task);
      else inProgressRaw.push(task);
    }

    const myFocus = {
      overdue: overdueRaw.map(toHomeTaskItem),
      dueToday: dueTodayRaw.map(toHomeTaskItem),
      inProgress: inProgressRaw.map(toHomeTaskItem),
    };

    const projectSummaries: HomeProjectSummary[] = projects.map((project) => {
      const boardIds = boardModules
        .filter((mod) => mod.project_id === project.id)
        .map((mod) => mod.reference_id);
      const projectTasks = workspaceTasks.filter((task) => boardIds.includes(task.column.board_id));
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter((task) => task.column.type === "COMPLETE").length;

      const memberMap = new Map<string, { id: string; name: string; avatarUrl: string | null }>();
      for (const task of projectTasks) {
        if (task.assignee && !memberMap.has(task.assignee.id)) {
          memberMap.set(task.assignee.id, {
            id: task.assignee.id,
            name: `${task.assignee.firstname} ${task.assignee.lastname}`,
            avatarUrl: task.assignee.avatar_key,
          });
        }
      }

      return {
        id: project.id,
        title: project.name,
        color: project.color,
        boardId: boardIds[0],
        totalTasks,
        completedTasks,
        progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        members: Array.from(memberMap.values()).slice(0, 6),
      };
    });

    const describeActivity = (activityType: (typeof activities)[number]["type"], metadata: unknown): string => {
      const meta = (metadata ?? {}) as Record<string, unknown>;
      switch (activityType) {
        case "COLUMN_MOVED":
          return `moved the task to ${meta.toColumnName ?? "another column"}`;
        case "PRIORITY_CHANGED":
          return `changed the priority to ${meta.to ?? "a new value"}`;
        case "ASSIGNEE_CHANGED":
          return "reassigned the task";
        case "DUE_DATE_CHANGED":
          return "updated the due date";
        default:
          return "updated the task";
      }
    };

    const recentActivity: HomeActivityItem[] = activities.map((activity) => ({
      id: activity.id,
      type: "task_moved",
      message: describeActivity(activity.type, activity.metadata),
      actor: {
        id: activity.actor.id,
        name: `${activity.actor.firstname} ${activity.actor.lastname}`,
        avatarUrl: activity.actor.avatar_key,
      },
      target: {
        id: activity.task.id,
        title: activity.task.title,
        href: `/board/${activity.task.column.board_id}`,
      },
      createdAt: activity.created_at.toISOString(),
    }));

    const result: WorkspaceHomeData = {
      summary: {
        greeting: this.getHomeGreeting(now),
        todayFormatted: this.formatHomeDate(now),
        urgentCount: myFocus.overdue.length + myFocus.dueToday.length,
        activeTasksCount: myFocus.overdue.length + myFocus.dueToday.length + myFocus.inProgress.length,
        completionVelocity,
        workspaceMembersCount: crew.length,
      },
      myFocus,
      projects: projectSummaries,
      pinnedModules,
      recentActivity,
      crew,
    };

    await this.cache.set(cacheKey, result, CacheTTL.WORKSPACE_HOME);

    return result;
  }

  private async getPinnedModules(workspaceId: string, userId: string): Promise<HomePinnedModule[]> {
    const pinned = await this.prisma.workspaceModule.findMany({
      where: { workspace_id: workspaceId, pinned_by_users: { some: { user_id: userId } } },
      orderBy: { position: "asc" },
    });

    return pinned.map((mod) => ({
      id: mod.id,
      name: mod.name,
      type: mod.type as unknown as HomePinnedModule["type"],
      isPinned: true,
      color: mod.color,
    }));
  }

  private getHomeGreeting(date: Date): string {
    const hour = date.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  private formatHomeDate(date: Date): string {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  async deleteTask(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      include: { column: { select: { board_id: true } } },
    });
    if (!task) throw new NotFoundException("Task not found");

    await this.prisma.task.update({
      where: { id: taskId },
      data: { is_deleted: true },
    });

    await Promise.all([
      this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId)),
      this.invalidateWorkspaceHome(workspaceId),
    ]);

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:deleted", { boardId: task.column.board_id, taskId });

    return { success: true };
  }

  async archiveTask(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      include: { column: { select: { board_id: true, type: true } } },
    });
    if (!task) throw new NotFoundException("Task not found");

    if (task.column.type !== "COMPLETE") {
      throw new BadRequestException("Task can only be archived from a COMPLETE column");
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: { is_archived: true },
    });

    await Promise.all([
      this.cache.invalidatePattern(CacheKeys.workspaceStatisticsPattern(workspaceId)),
      this.invalidateWorkspaceHome(workspaceId),
    ]);

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:updated", {
        boardId: task.column.board_id,
        taskId,
        data: { is_archived: true },
      });

    return { success: true, data: updatedTask };
  }

  async getTaskAttachmentDownloadUrl(workspaceId: string, key: string, userId: string): Promise<string> {
    // Chat attachments are authorized by room-membership via the key's room-id prefix
    // (the same check presignAttachment applies), not by the ChatAttachment row —
    // that row is written asynchronously by the chat persist queue, so a freshly-sent
    // message's attachment can be fetched before the row exists.
    const keyPrefix = key.split("_")[0];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyPrefix);

    const [taskAttachment, chatRoom, fileRoom] = await Promise.all([
      this.prisma.taskAttachment.findFirst({
        where: { key, task: { column: { board: { workspace_id: workspaceId } } } },
        select: { id: true },
      }),
      isUuid
        ? this.prisma.chatRoom.findFirst({
            where: { id: keyPrefix, workspace_id: workspaceId },
            select: { id: true, is_direct: true, dm_user_a_id: true, dm_user_b_id: true },
          })
        : null,
      isUuid
        ? this.prisma.fileRoom.findFirst({
            where: { id: keyPrefix, workspace_id: workspaceId },
            select: { id: true },
          })
        : null,
    ]);
    if (!taskAttachment && !chatRoom && !fileRoom) throw new NotFoundException("File not found");

    if (
      chatRoom?.is_direct &&
      chatRoom.dm_user_a_id !== userId &&
      chatRoom.dm_user_b_id !== userId
    ) {
      throw new NotFoundException("File not found");
    }

    return this.storageService.presignFileGet(key);
  }

  async presignTaskAttachment(
    workspaceId: string,
    taskId: string,
    contentType: string,
    fileName: string,
  ): Promise<PresignedAvatarUpload> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException("Task not found");

    return this.storageService.presignFileUpload(contentType, fileName, taskId);
  }

  async createTaskAttachment(
    workspaceId: string,
    taskId: string,
    userId: string,
    dto: CreateTaskAttachmentDto,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      include: { column: { select: { board_id: true } } },
    });
    if (!task) throw new NotFoundException("Task not found");

    if (!dto.key.startsWith(`${taskId}_`)) {
      throw new BadRequestException("Invalid attachment key");
    }

    const attachment = await this.prisma.taskAttachment.create({
      data: {
        task_id: taskId,
        key: dto.key,
        file_name: dto.file_name,
        file_size: dto.file_size,
        mime_type: dto.mime_type,
        uploaded_by: userId,
      },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:attachment:added", {
        boardId: task.column.board_id,
        taskId,
        attachment,
      });

    return { success: true, data: attachment };
  }

  async deleteTaskAttachment(workspaceId: string, taskId: string, attachmentId: string) {
    const attachment = await this.prisma.taskAttachment.findFirst({
      where: { id: attachmentId, task: { id: taskId, column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!attachment) throw new NotFoundException("Attachment not found");

    await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });
    await this.storageService.deleteFileObject(attachment.key);

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:attachment:removed", {
        boardId: attachment.task.column.board_id,
        taskId,
        attachmentId,
      });

    return { success: true };
  }

  async createTaskComment(
    workspaceId: string,
    taskId: string,
    authorId: string,
    dto: CreateTaskCommentDto,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      include: {
        column: {
          select: {
            board_id: true,
            board: { select: { name: true, workspace: { select: { slug: true, name: true } } } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException("Task not found");

    const validMentionIds = dto.mentionedUserIds?.length
      ? (
          await this.prisma.workspaceMember.findMany({
            where: { workspace_id: workspaceId, user_id: { in: dto.mentionedUserIds } },
            select: { user_id: true },
          })
        ).map((m) => m.user_id)
      : [];

    const comment = await this.prisma.taskComment.create({
      data: {
        task_id: taskId,
        workspace_id: workspaceId,
        author_id: authorId,
        content: dto.content,
        ...(validMentionIds.length ? { mentions: { connect: validMentionIds.map((id) => ({ id })) } } : {}),
      },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    const commentCount = await this.prisma.taskComment.count({
      where: { task_id: taskId, is_deleted: false },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:comment:created", {
        boardId: task.column.board_id,
        taskId,
        comment,
        commentCount,
      });

    if (validMentionIds.length) {
      const mentionPayload = {
        comment,
        task: { id: task.id, shortId: task.shortId, title: task.title },
        board: { id: task.column.board_id, name: task.column.board.name },
        workspace: { slug: task.column.board.workspace.slug, name: task.column.board.workspace.name },
      };
      for (const mentionedId of validMentionIds) {
        if (mentionedId !== authorId) {
          await this.notificationService.create(mentionedId, workspaceId, "TASK_COMMENT_MENTION", mentionPayload);
        }
      }
    }

    return { success: true, data: comment };
  }

  async listTaskComments(
    workspaceId: string,
    taskId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException("Task not found");

    const take = Math.min(Number(limit) || 50, 100);

    const comments = await this.prisma.taskComment.findMany({
      where: {
        task_id: taskId,
        ...(cursor ? { created_at: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { created_at: "desc" },
      take: take + 1,
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    const hasMore = comments.length > take;
    if (hasMore) comments.pop();
    const ordered = comments.reverse();

    return {
      success: true,
      data: {
        comments: ordered,
        next_cursor: hasMore && ordered.length > 0 ? ordered[0].created_at.toISOString() : null,
        has_more: hasMore,
      },
    };
  }

  async updateTaskComment(
    workspaceId: string,
    taskId: string,
    commentId: string,
    authorId: string,
    dto: UpdateTaskCommentDto,
  ) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, task_id: taskId, task: { column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.author_id !== authorId) throw new ForbiddenException("Not authorized to edit this comment");

    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content: dto.content, is_edited: true },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:comment:updated", { boardId: comment.task.column.board_id, taskId, comment: updated });

    return { success: true, data: updated };
  }

  async deleteTaskComment(workspaceId: string, taskId: string, commentId: string, authorId: string) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, task_id: taskId, task: { column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.author_id !== authorId) throw new ForbiddenException("Not authorized to delete this comment");

    await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { is_deleted: true, content: "This comment was deleted." },
    });

    const commentCount = await this.prisma.taskComment.count({
      where: { task_id: taskId, is_deleted: false },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:comment:deleted", { boardId: comment.task.column.board_id, taskId, commentId, commentCount });

    return { success: true };
  }

  async listTaskActivity(
    workspaceId: string,
    taskId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException("Task not found");

    const take = Math.min(Number(limit) || 50, 100);

    const activities = await this.prisma.taskActivity.findMany({
      where: {
        task_id: taskId,
        ...(cursor ? { created_at: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { created_at: "desc" },
      take: take + 1,
      include: { actor: { select: COMMENT_AUTHOR_SELECT } },
    });

    const hasMore = activities.length > take;
    if (hasMore) activities.pop();
    const ordered = activities.reverse();

    return {
      success: true,
      data: {
        activities: ordered,
        next_cursor: hasMore && ordered.length > 0 ? ordered[0].created_at.toISOString() : null,
        has_more: hasMore,
      },
    };
  }

  async createTaskChecklistItem(
    workspaceId: string,
    taskId: string,
    userId: string,
    dto: CreateTaskChecklistItemDto,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      include: { column: { select: { board_id: true } } },
    });
    if (!task) throw new NotFoundException("Task not found");

    const position = await this.prisma.taskChecklistItem.count({ where: { task_id: taskId } });

    const item = await this.prisma.taskChecklistItem.create({
      data: {
        task_id: taskId,
        content: dto.content,
        created_by: userId,
        position,
      },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:checklist:created", { boardId: task.column.board_id, taskId, item });

    return { success: true, data: item };
  }

  async updateTaskChecklistItem(
    workspaceId: string,
    taskId: string,
    itemId: string,
    dto: UpdateTaskChecklistItemDto,
  ) {
    const item = await this.prisma.taskChecklistItem.findFirst({
      where: { id: itemId, task_id: taskId, task: { column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!item) throw new NotFoundException("Checklist item not found");

    const updated = await this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: { ...(dto.content !== undefined && { content: dto.content }), ...(dto.is_completed !== undefined && { is_completed: dto.is_completed }) },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:checklist:updated", { boardId: item.task.column.board_id, taskId, item: updated });

    return { success: true, data: updated };
  }

  async deleteTaskChecklistItem(workspaceId: string, taskId: string, itemId: string) {
    const item = await this.prisma.taskChecklistItem.findFirst({
      where: { id: itemId, task_id: taskId, task: { column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!item) throw new NotFoundException("Checklist item not found");

    await this.prisma.taskChecklistItem.delete({ where: { id: itemId } });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:checklist:deleted", { boardId: item.task.column.board_id, taskId, itemId });

    return { success: true };
  }
}