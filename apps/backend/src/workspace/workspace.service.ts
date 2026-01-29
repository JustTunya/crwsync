import { randomBytes } from "crypto";
import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { WorkspaceRoleEnum } from "@prisma/client";
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto } from "src/workspace/dto/workspace.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException("Workspace slug already taken");

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
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
  }

  async findAllUserWorkspaces(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { user_id: userId },
      include: { workspace: true },
    });
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.workspace.delete({ where: { id } });
  }

  async inviteMember(workspaceId: string, creatorId: string, dto: InviteMemberDto) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.workspaceInvite.create({
      data: {
        workspace_id: workspaceId,
        email: dto.email,
        role: dto.role,
        token: token,
        expires_at: expiresAt,
        created_by_id: creatorId,
      },
    });
  }

  async joinWorkspace(userId: string, token: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.workspaceInvite.findUnique({ where: { token } });
      
      if (!invite || invite.status !== "pending") 
        throw new BadRequestException("Invalid or expired invite");
      
      if (new Date() > invite.expires_at) {
        await tx.workspaceInvite.update({ where: { id: invite.id }, data: { status: "expired" }});
        throw new BadRequestException("Invite expired");
      }

      const member = await tx.workspaceMember.upsert({
        where: {
            workspace_id_user_id: {
                workspace_id: invite.workspace_id,
                user_id: userId
            }
        },
        update: {},
        create: {
          workspace_id: invite.workspace_id,
          user_id: userId,
          role: invite.role,
        },
      });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });

      return member;
    });
  }
}