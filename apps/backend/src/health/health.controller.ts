import { Controller, Get } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "src/common/decorators/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get()
  ping() {
    return { status: "ok", uptime: process.uptime() };
  }
}