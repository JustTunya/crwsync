import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  Req
} from "@nestjs/common";
import { Request } from "express";
import { SessionService } from "src/session/session.service";
import { SessionEntity } from "src/session/session.entity";
import { CreateSessionDto } from "src/session/dto/create-session.dto";
import { UpdateSessionDto } from "src/session/dto/update-session.dto";
import { RotateSessionDto } from "src/session/dto/rotate-session.dto";

@Controller("sessions")
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSessionDto, @Req() req: Request): Promise<SessionEntity> {
    return this.sessionService.create(dto, req);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<SessionEntity[]> {
    return this.sessionService.findAll();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<SessionEntity> {
    return this.sessionService.findOne(id);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateSessionDto
  ): Promise<SessionEntity> {
    return this.sessionService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<void> {
    await this.sessionService.remove(id);
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  verify(
    @Query("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Query("token") token: string
  ): Promise<SessionEntity> {
    return this.sessionService.verify(userId, token);
  }

  @Post("rotate")
  @HttpCode(HttpStatus.OK)
  rotate(@Body() dto: RotateSessionDto, @Req() req: Request): Promise<SessionEntity> {
    return this.sessionService.rotate(dto, req);
  }

  @Post("revoke/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<void> {
    await this.sessionService.revoke(id);
  }

  @Post("revoke-all/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAll(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<void> {
    await this.sessionService.revokeAll(userId);
  }

  @Post("purge-expired")
  @HttpCode(HttpStatus.NO_CONTENT)
  async purgeExpired(): Promise<void> {
    await this.sessionService.purgeExpired();
  }
}