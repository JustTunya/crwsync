import { Global, Module } from "@nestjs/common";
import { StorageService } from "src/storage/storage.service";
import { AvatarsController } from "src/storage/avatars.controller";

@Global()
@Module({
  controllers: [AvatarsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
