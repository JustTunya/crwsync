import { Module } from "@nestjs/common";
import { WorkspaceService } from "src/workspace/workspace.service";
import { WorkspaceController } from "src/workspace/workspace.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { StatusModule } from "src/status/status.module";

@Module({
  imports: [PrismaModule, StatusModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}