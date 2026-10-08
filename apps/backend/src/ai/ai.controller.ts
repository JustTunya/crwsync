import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { AiEnabledGuard } from "src/ai/ai-enabled.guard";
import { AiService } from "src/ai/ai.service";
import { DigestDto, StandupDto, SummaryDto, TaskDraftsDto } from "src/ai/dto/ai.dto";

@Controller("workspaces/:workspaceId/ai")
@UseGuards(AiEnabledGuard, IsMemberGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("rooms/:roomId/summary")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  summarizeRoom(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: SummaryDto,
  ) {
    return this.aiService.summarizeRoom(workspaceId, user.userId, roomId, dto.limit);
  }

  @Post("rooms/:roomId/task-drafts")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  draftTasks(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: TaskDraftsDto,
  ) {
    return this.aiService.draftTasks(workspaceId, user.userId, roomId, dto);
  }

  @Post("boards/:boardId/digest")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  digestBoard(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: DigestDto,
  ) {
    return this.aiService.digestBoard(workspaceId, user.userId, boardId, dto.since);
  }

  @Post("standup")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  standup(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: StandupDto,
  ) {
    return this.aiService.standup(workspaceId, user.userId, dto);
  }

  @Get("jobs/:jobId")
  @SkipThrottle()
  getJob(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("jobId") jobId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.aiService.getJob(workspaceId, user.userId, jobId);
  }
}
