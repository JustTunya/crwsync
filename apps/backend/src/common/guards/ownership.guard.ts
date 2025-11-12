import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly paramName: string = "userId") {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest() as any;
    const user = req.user as { userId: string; role?: RoleEnum };
    const targetId = req.params?.[this.paramName];

    if (!user || !targetId) throw new ForbiddenException();

    if (user.role === RoleEnum.ADMIN) return true;
    if (user.userId === targetId) return true;

    throw new ForbiddenException("Not owner");
  }
}