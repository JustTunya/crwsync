import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { WorkspaceRoleEnum } from "@prisma/client";
import { WorkspaceInviteStatusEnum } from "@crwsync/types";
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto } from "src/workspace/dto/workspace.dto";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private async invMembershipCaches(workspaceId: string, userId: string) {
    await Promise.all([
      this.cache.del(CacheKeys.workspaceMember(workspaceId, userId)),
      this.cache.del(CacheKeys.userWorkspaces(userId)),
      this.cache.del(CacheKeys.workspace(workspaceId)),
    ]);
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException("Workspace slug already taken");

    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.name, slug: dto.slug },
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
    const result = await this.prisma.workspace.update({ where: { id }, data: dto });
    await this.cache.del(CacheKeys.workspace(id));
    return result;
  }

  async remove(id: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspace_id: id },
      select: { user_id: true },
    });

    const result = await this.prisma.workspace.delete({ where: { id } });

    const cacheKeys = [
      CacheKeys.workspace(id),
      ...members.flatMap((m) => [
        CacheKeys.workspaceMember(id, m.user_id),
        CacheKeys.userWorkspaces(m.user_id),
      ]),
    ];
    await this.cache.del(cacheKeys);

    return result;
  }

  async sendInvite(workspaceId: string, creatorId: string, dto: InviteMemberDto) {
    const invitee = await this.prisma.user.findUnique({ where: { username: dto.username } });

    if (!invitee) throw new NotFoundException("User not found");

    const isMember = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: invitee.id } },
    });

    if (isMember) throw new BadRequestException("User is already a member of the workspace");

    const existingInvite = await this.prisma.workspaceInvite.findUnique({
      where: { invitee_id_workspace_id: { invitee_id: invitee.id, workspace_id: workspaceId } },
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

    return this.prisma.workspaceInvite.create({
      data: {
        invitee_id: invitee.id,
        creator_id: creatorId,
        workspace_id: workspaceId,
        role: dto.role,
      },
    });
  }

  async revokeInvite(workspaceId: string, inviteId: string) {
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspace_id: workspaceId, status: WorkspaceInviteStatusEnum.PENDING },
    });

    if (!invite) throw new NotFoundException("No pending invite found for this workspace");

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

    await this.invMembershipCaches(workspaceId, userId);
  }

  async declineInvite(workspaceId: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { workspace_id: workspaceId, invitee_id: userId, status: WorkspaceInviteStatusEnum.PENDING },
    });

    if (!invite) throw new NotFoundException("No pending invite found for this workspace");

    return this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: WorkspaceInviteStatusEnum.DECLINED },
    });
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

    await this.cache.del(CacheKeys.workspaceMember(workspaceId, memberId));

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
      this.cache.del(CacheKeys.workspaceMember(workspaceId, currentOwnerId)),
      this.cache.del(CacheKeys.workspaceMember(workspaceId, newOwnerId)),
    ]);
  }
}