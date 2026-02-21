import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { WorkspaceMember, Workspace } from "@prisma/client";
import { CacheService, CacheKeys, CacheTTL } from "src/redis";
import { PrismaService } from "src/prisma/prisma.service";

type MemberWithWorkspace = WorkspaceMember & { workspace: Workspace };

@Injectable()
export class IsMemberGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const userId = request.user?.userId;
    const workspaceId = request.params.workspaceId;

    if (!userId || !workspaceId) return false;

    const cacheKey = CacheKeys.workspaceMember(workspaceId, userId);

    let cacheMember = await this.cache.get<MemberWithWorkspace>(cacheKey);

    if (!cacheMember) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: workspaceId,
            user_id: userId,
          },
        },
        include: { workspace: true },
      });

      if (!member) {
        throw new ForbiddenException("You are not a member of this workspace");
      }

      await this.cache.set(cacheKey, member, CacheTTL.WORKSPACE_MEMBER);
      cacheMember = member;
    }

    request.member = cacheMember;
    request.workspace = cacheMember.workspace;

    return true;
  }
}