import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceRoleEnum } from "@prisma/client";
import { ROLES_KEY } from "src/workspace/decorators/ws-roles.decorator";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.params.workspaceId || request.body.workspaceId;

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { user_id: user.userId, workspace_id: workspaceId } },
    });

    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(", ")}`);
    }

    return true;
  }
}