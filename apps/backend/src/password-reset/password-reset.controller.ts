import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, Delete, Patch, ParseUUIDPipe, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { PasswordResetStatus, RoleEnum } from "@crwsync/types";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";
import { UpdatePasswordResetDto } from "src/password-reset/dto/update-password-reset.dto";
import { ResetPasswordDto } from "src/password-reset/dto/reset-password.dto";
import { PasswordResetService } from "src/password-reset/password-reset.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { Public } from "src/common/decorators/public.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { PasswordResetPublic } from "src/prisma/selects";

@Controller("password-resets")
@UseGuards(JwtAuthGuard)
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePasswordResetDto): Promise<PasswordResetPublic> {
    return this.passwordResetService.create(dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query("email") email?: string,
    @Query("token") token?: string
  ): Promise<PasswordResetPublic[]> {
    try {
      if (email) {
        const v = await this.passwordResetService.findByEmail(email);
        return [v];
      }
      if (token) {
        const v = await this.passwordResetService.findByToken(token);
        return [v];
      }
    } catch (err) {
      if (err instanceof NotFoundException) {
        return [];
      }
      throw err;
    }

    return this.passwordResetService.findAll();
  }

  @Public()
  @Get("token-status")
  @HttpCode(HttpStatus.OK)
  async getTokenStatus(@Query("token") token: string): Promise<{ status: PasswordResetStatus }> {
    return this.passwordResetService.getTokenStatus(token);
  }

  @Roles(RoleEnum.ADMIN)
  @Get(":passwordResetId")
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("passwordResetId", new ParseUUIDPipe({ version: "4" })) passwordResetId: string): Promise<PasswordResetPublic> {
    return this.passwordResetService.findOne(passwordResetId);
  }

  @Roles(RoleEnum.ADMIN)
  @Patch(":passwordResetId")
  @HttpCode(HttpStatus.OK)
  async update(@Param("passwordResetId", new ParseUUIDPipe({ version: "4" })) passwordResetId: string, @Body() dto: UpdatePasswordResetDto): Promise<PasswordResetPublic> {
    return this.passwordResetService.update(passwordResetId, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(":passwordResetId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("passwordResetId", new ParseUUIDPipe({ version: "4" })) passwordResetId: string): Promise<void> {
    await this.passwordResetService.remove(passwordResetId);
  }

  @Public()
  @Post("reset")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.passwordResetService.reset(dto);
  }
}