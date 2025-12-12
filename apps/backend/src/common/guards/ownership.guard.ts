import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";
import { Request } from "express";

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly paramName: string = "userId") {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { userId: string; role?: RoleEnum } }>();
    const user = req.user;
    const targetId = req.params?.[this.paramName];

    if (!user || !targetId) throw new ForbiddenException();

    if (user.role === RoleEnum.ADMIN) return true;
    if (user.userId === targetId) return true;

    throw new ForbiddenException("Not owner");
  }
}