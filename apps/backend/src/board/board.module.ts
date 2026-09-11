import { Module } from "@nestjs/common";
import { BoardService } from "src/board/board.service";
import { BoardController, ModuleController, ProjectController } from "src/board/board.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { StatusModule } from "src/status/status.module";
import { NotificationModule } from "src/notification/notification.module";

@Module({
  imports: [PrismaModule, StatusModule, NotificationModule],
  controllers: [BoardController, ModuleController, ProjectController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
