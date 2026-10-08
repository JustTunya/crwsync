import { Module } from "@nestjs/common";
import { WaitlistController } from "src/waitlist/waitlist.controller";
import { WaitlistService } from "src/waitlist/waitlist.service";

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
