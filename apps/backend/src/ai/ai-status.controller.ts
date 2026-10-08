import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { AiService } from "src/ai/ai.service";

@Controller("ai")
@SkipThrottle()
export class AiStatusController {
  constructor(private readonly aiService: AiService) {}

  @Get("status")
  status(@ActiveUserParam() user: ActiveUser) {
    return this.aiService.getStatus(user.userId);
  }
}
