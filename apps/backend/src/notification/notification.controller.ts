import { Controller, Get, Patch, Param, ParseUUIDPipe, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { NotificationService } from "src/notification/notification.service";
import { OwnershipGuard } from "src/common/guards/ownership.guard";

@Controller("users/:userId/notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(new OwnershipGuard("userId"))
  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string) {
    return this.notificationService.list(userId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Patch("read-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<void> {
    await this.notificationService.markAllRead(userId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Patch(":notificationId/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Param("notificationId", new ParseUUIDPipe({ version: "4" })) notificationId: string,
  ): Promise<void> {
    await this.notificationService.markRead(userId, notificationId);
  }
}
