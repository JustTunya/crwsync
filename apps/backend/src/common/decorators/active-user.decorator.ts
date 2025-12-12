import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { ActiveUser } from "src/common/types/active-user.type";

export const ActiveUserParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as ActiveUser | undefined;
  }
);