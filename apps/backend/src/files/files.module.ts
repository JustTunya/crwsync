import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { StatusModule } from "src/status/status.module";
import { StorageModule } from "src/storage/storage.module";
import { FilesService } from "src/files/files.service";
import { FilesController } from "src/files/files.controller";

@Module({
  imports: [PrismaModule, StatusModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
