import { BadRequestException, Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
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
    if (!/^[A-Za-z0-9_-]+\.(png|jpg|webp|gif)$/.test(key)) throw new BadRequestException("Invalid avatar key");

    const url = await this.storageService.presignGet(key);
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.redirect(HttpStatus.FOUND, url);
  }
}
