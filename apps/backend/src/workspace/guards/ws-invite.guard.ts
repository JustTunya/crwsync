import type { Request } from "express";
import { ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { WorkspaceInviteStatusEnum } from "@crwsync/types";
import { PrismaService } from "src/prisma/prisma.service";
import type { ActiveUser } from "src/common/types/active-user.type";


@Injectable()
export class HasPendingInviteGuard {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: ActiveUser }>();

    const userId = req.user?.userId;
    const workspaceId = req.params?.workspaceId;

    if (!userId || !workspaceId) {
      throw new ForbiddenException("Invalid invite context.");
    }

    const invite = await this.prisma.workspaceInvite.findFirst({
      where: {
        workspace_id: workspaceId as string,
        invitee_id: userId,
        status: WorkspaceInviteStatusEnum.PENDING,
      },
      select: { id: true },
    });

    if (!invite) {
      throw new ForbiddenException("No pending invite found for this workspace.");
    }

    return true;
  }
}