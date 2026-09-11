import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { ChatService } from "src/chat/chat.service";
import { CreateDmDto } from "src/chat/dto/dm.dto";

@Controller("workspaces/:workspaceId/dms")
@UseGuards(IsMemberGuard)
@SkipThrottle()
export class DmController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.chatService.listDms(workspaceId, user.userId);
  }

  @Post()
  open(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateDmDto,
  ) {
    return this.chatService.getOrCreateDm(workspaceId, user.userId, dto.otherUserId);
  }
}
