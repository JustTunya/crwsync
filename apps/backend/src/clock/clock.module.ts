import { Module } from "@nestjs/common";
import { ClockService } from "src/clock/clock.service";
import { EmailModule } from "src/email/email.module";

@Module({
  imports: [EmailModule],
  providers: [ClockService],
  exports: [ClockService],
})
export class ClockModule {}
