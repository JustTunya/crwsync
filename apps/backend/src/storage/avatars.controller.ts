import { Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { Public } from "src/common/decorators/public.decorator";
import { StorageService } from "src/storage/storage.service";

@Controller("avatars")
export class AvatarsController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @SkipThrottle()
  @Get(":key")
  async getAvatar(@Param("key") key: string, @Res() res: Response): Promise<void> {
    const url = await this.storageService.presignGet(key);
    res.redirect(HttpStatus.FOUND, url);
  }
}
