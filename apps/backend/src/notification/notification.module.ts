import { Module } from "@nestjs/common";
import { NotificationService } from "src/notification/notification.service";
import { NotificationController } from "src/notification/notification.controller";
import { StatusModule } from "src/status/status.module";

@Module({
  imports: [StatusModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
