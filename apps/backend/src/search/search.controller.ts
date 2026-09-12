import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { SearchService } from "src/search/search.service";
import { SearchQueryDto } from "src/search/dto/search.dto";

@Controller("workspaces/:workspaceId/search")
@UseGuards(IsMemberGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Throttle({ default: { ttl: 10_000, limit: 20 } })
  search(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Query() { q }: SearchQueryDto,
  ) {
    return this.searchService.search(workspaceId, user.userId, q);
  }
}
