import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class IsMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; 
    const workspaceId = request.params.id;

    if (!user || !workspaceId) return false;

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
      include: { workspace: true },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace");
    }

    request.member = member;
    request.workspace = member.workspace;
    
    return true;
  }
}