import { Module } from "@nestjs/common";
import { BoardService } from "src/board/board.service";
import { BoardController, ModuleController } from "src/board/board.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { StatusModule } from "src/status/status.module";

@Module({
  imports: [PrismaModule, StatusModule],
  controllers: [BoardController, ModuleController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
