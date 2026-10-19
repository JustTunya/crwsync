import { Module } from "@nestjs/common";
import { PilotService } from "src/pilot/pilot.service";

@Module({
  providers: [PilotService],
  exports: [PilotService],
})
export class PilotModule {}
