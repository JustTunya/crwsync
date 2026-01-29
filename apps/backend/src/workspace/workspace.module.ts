import { Module } from "@nestjs/common";
import { WorkspaceService } from "src/workspace/workspace.service";
import { WorkspaceController } from "src/workspace/workspace.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}