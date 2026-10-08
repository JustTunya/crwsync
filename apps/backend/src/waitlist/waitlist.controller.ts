import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "src/common/decorators/public.decorator";
import { WaitlistService } from "src/waitlist/waitlist.service";
import { WaitlistDto } from "src/waitlist/dto/waitlist.dto";

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @HttpCode(200)
  @Post()
  async join(@Body() dto: WaitlistDto) {
    await this.waitlistService.join(dto);
    return { success: true, message: "You are on the list. We will write when early access opens." };
  }
}
