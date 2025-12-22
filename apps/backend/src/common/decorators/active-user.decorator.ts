import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { ActiveUser } from "src/common/types/active-user.type";

export const ActiveUserParam = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ActiveUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: ActiveUser }>();
    const user = req.user;

    if (!user?.userId) {
      throw new UnauthorizedException();
    }

    return user;
  }
);