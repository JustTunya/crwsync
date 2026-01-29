import { 
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request 
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { WorkspaceRoleEnum, WorkspaceMember, Workspace } from "@prisma/client";
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto } from "src/workspace/dto/workspace.dto";
import { RequireWorkspaceRoles } from "src/workspace/decorators/ws-roles.decorator";
import { WorkspaceRolesGuard } from "src/workspace/guards/ws-roles.guard";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { WorkspaceService } from "src/workspace/workspace.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ActiveUser } from "src/common/types/active-user.type";

type AuthenticatedRequest = ExpressRequest & {
  user: ActiveUser;
};

type WorkspaceRequest = ExpressRequest & {
  member: WorkspaceMember;
  workspace: Workspace;
};

@UseGuards(JwtAuthGuard)
@Controller("workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspaceService.createWorkspace(req.user.userId, createWorkspaceDto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.workspaceService.findAllUserWorkspaces(req.user.userId);
  }

  @Post("join/:token")
  join(@Request() req: AuthenticatedRequest, @Param("token") token: string) {
    return this.workspaceService.joinWorkspace(req.user.userId, token);
  }

  @Get(":id")
  @UseGuards(IsMemberGuard)
  findOne(@Param("id") id: string) {
    return this.workspaceService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  update(@Param("id") id: string, @Body() updateWorkspaceDto: UpdateWorkspaceDto) {
    return this.workspaceService.update(id, updateWorkspaceDto);
  }

  @Delete(":id")
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER)
  remove(@Param("id") id: string) {
    return this.workspaceService.remove(id);
  }

  @Post(":id/invite")
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  invite(
    @Param("id") id: string, 
    @Request() req: WorkspaceRequest,
    @Body() inviteDto: InviteMemberDto
  ) {
    return this.workspaceService.inviteMember(id, req.member.id, inviteDto);
  }
}