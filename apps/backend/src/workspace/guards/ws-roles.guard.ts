import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceRoleEnum } from "@prisma/client";
import { ROLES_KEY } from "src/workspace/decorators/ws-roles.decorator";

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const member = request.member;

    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(", ")}`);
    }

    return true;
  }
}