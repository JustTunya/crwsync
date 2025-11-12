import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleEnum } from "@crwsync/types";
import { ROLES_KEY } from "src/common/constants";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest() as any;
    const user = request.user as { role?: RoleEnum };

    if (!user?.role) throw new ForbiddenException("Missing role");
    if (!required.includes(user.role)) throw new ForbiddenException("Forbidden");

    return true;
  }
}