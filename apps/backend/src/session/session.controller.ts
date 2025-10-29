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
  create(@Body() dto: CreateSessionDto, @Req() req: Request): Promise<{session: SessionEntity, token: string}> {
    return this.sessionService.create(dto, req);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<SessionEntity[]> {
    return this.sessionService.findAll();
  }

  @Get(":sessionId")
  @HttpCode(HttpStatus.OK)
  findOne(@Param("sessionId", new ParseUUIDPipe({ version: "4" })) sessionId: string): Promise<SessionEntity> {
    return this.sessionService.findOne(sessionId);
  }

  @Patch(":sessionId")
  @HttpCode(HttpStatus.OK)
  update(
    @Param("sessionId", new ParseUUIDPipe({ version: "4" })) sessionId: string,
    @Body() dto: UpdateSessionDto
  ): Promise<SessionEntity> {
    return this.sessionService.update(sessionId, dto);
  }

  @Delete(":sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("sessionId", new ParseUUIDPipe({ version: "4" })) sessionId: string): Promise<void> {
    await this.sessionService.remove(sessionId);
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

  @Delete("revoke/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param("sessionId", new ParseUUIDPipe({ version: "4" })) sessionId: string): Promise<void> {
    await this.sessionService.revoke(sessionId);
  }

  @Delete("revoke-all/:userId")
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