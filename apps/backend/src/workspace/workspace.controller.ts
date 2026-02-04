import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Req } from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { WorkspaceRoleEnum, Workspace, WorkspaceMember } from "@prisma/client";
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, UpdateMemberRoleDto } from "src/workspace/dto/workspace.dto";
import { RequireWorkspaceRoles } from "src/workspace/decorators/ws-roles.decorator";
import { HasPendingInviteGuard } from "src/workspace/guards/ws-invite.guard";
import { WorkspaceRolesGuard } from "src/workspace/guards/ws-roles.guard";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { WorkspaceService } from "src/workspace/workspace.service";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";

interface WSRequest extends ExpressRequest {
  workspace: Workspace;
  member: WorkspaceMember;
}

@Controller("workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  create(@ActiveUserParam() user: ActiveUser, @Body() createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspaceService.createWorkspace(user.userId, createWorkspaceDto);
  }

  @Get()
  @SkipThrottle()
  findAll(@ActiveUserParam() user: ActiveUser) {
    return this.workspaceService.findAllUserWorkspaces(user.userId);
  }

  @Get(":workspaceId")
  @SkipThrottle()
  @UseGuards(IsMemberGuard)
  findOne(@Req() req: WSRequest) {
    return req.workspace;
  }

  @Patch(":workspaceId")
  @Throttle({ default: { ttl: 60, limit: 30 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  update(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Body() dto: UpdateWorkspaceDto
  ) {
    return this.workspaceService.update(workspaceId, dto);
  }

  @Delete(":workspaceId")
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER)
  remove(@Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string) {
    return this.workspaceService.remove(workspaceId);
  }

  @Post(":workspaceId/invites")
  @Throttle({ default: { ttl: 3600, limit: 50 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  sendInvite(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: InviteMemberDto
  ) {
    return this.workspaceService.sendInvite(workspaceId, user.userId, dto);
  }

  @Delete(":workspaceId/invites/:inviteId")
  @Throttle({ default: { ttl: 3600, limit: 50 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  revokeInvite(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("inviteId", new ParseUUIDPipe({ version: "4" })) inviteId: string
  ) {
    return this.workspaceService.revokeInvite(workspaceId, inviteId);
  }

  @Delete(":workspaceId/members/:userId")
  @Throttle({ default: { ttl: 3600, limit: 50 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  kickMember(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userIdToKick: string
  ) {
    return this.workspaceService.kickMember(workspaceId, userIdToKick);
  }

  @Patch(":workspaceId/members/:userId/role")
  @Throttle({ default: { ttl: 3600, limit: 50 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER) 
  updateMemberRole(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("userId", new ParseUUIDPipe({ version: "4" })) memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(workspaceId, memberUserId, dto.role);
  }

  @Delete(":workspaceId/leave")
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  @UseGuards(IsMemberGuard)
  leaveWorkspace(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string, 
    @ActiveUserParam() user: ActiveUser
  ) {
    return this.workspaceService.leaveWorkspace(workspaceId, user.userId);
  }

  @Post(":workspaceId/invites/accept")
  @Throttle({ default: { ttl: 300, limit: 5 } })
  @UseGuards(HasPendingInviteGuard)
  acceptInvite(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser
  ) {
    return this.workspaceService.acceptInvite(workspaceId, user.userId);
  }

  @Post(":workspaceId/invites/decline")
  @Throttle({ default: { ttl: 300, limit: 5 } })
  @UseGuards(HasPendingInviteGuard)
  declineInvite(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser
  ) {
    return this.workspaceService.declineInvite(workspaceId, user.userId);
  }

  @Post(":workspaceId/transfer-ownership")
  @Throttle({ default: { ttl: 86400, limit: 5 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER)
  transferOwnership(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body("newOwnerId", new ParseUUIDPipe({ version: "4" })) newOwnerId: string
  ) {
    return this.workspaceService.transferOwnership(workspaceId, user.userId, newOwnerId);
  }
}