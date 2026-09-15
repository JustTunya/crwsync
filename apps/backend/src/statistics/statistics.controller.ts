import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { WorkspaceRolesGuard } from "src/workspace/guards/ws-roles.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { StatisticsService } from "src/statistics/statistics.service";
import { StatisticsQueryDto } from "src/statistics/dto/statistics.dto";

@Controller("workspaces/:workspaceId/statistics")
@UseGuards(JwtAuthGuard, IsMemberGuard, WorkspaceRolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @SkipThrottle()
  getWorkspaceStatistics(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Query() query: StatisticsQueryDto,
  ) {
    return this.statisticsService.getWorkspaceStatistics(
      workspaceId,
      user.userId,
      query,
    );
  }
}
