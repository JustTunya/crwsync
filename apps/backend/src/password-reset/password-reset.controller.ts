import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, Delete, Patch, ParseUUIDPipe, Query } from "@nestjs/common";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";
import { UpdatePasswordResetDto } from "src/password-reset/dto/update-password-reset.dto";
import { PasswordResetService } from "src/password-reset/password-reset.service";
import { PasswordResetEntity } from "src/password-reset/password-reset.entity";

// @UseGuards(AuthGuard("jwt"))
@Controller("password-resets")
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePasswordResetDto): Promise<PasswordResetEntity> {
    return this.passwordResetService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query("email") email?: string,
    @Query("token") token?: string
  ): Promise<PasswordResetEntity[]> {
    if (email) {
      const v = await this.passwordResetService.findByEmail(email);
      return v ? [v] : [];
    }
    if (token) {
      const v = await this.passwordResetService.findByToken(token);
      return v ? [v] : [];
    }

    return this.passwordResetService.findAll();
  }

  @Get(":passwordResetId")
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("passwordResetId", new ParseUUIDPipe({ version: "4" })) passwordResetId: string): Promise<PasswordResetEntity> {
    return this.passwordResetService.findOne(passwordResetId);
  }

  @Patch(":passwordResetId")
  @HttpCode(HttpStatus.OK)
  async update(@Param("passwordResetId", new ParseUUIDPipe({ version: "4" })) passwordResetId: string, @Body() dto: UpdatePasswordResetDto): Promise<PasswordResetEntity> {
    return this.passwordResetService.update(passwordResetId, dto);
  }

  @Delete(":passwordResetId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("passwordResetId", new ParseUUIDPipe({ version: "4" })) passwordResetId: string): Promise<void> {
    await this.passwordResetService.remove(passwordResetId);
  }

  @Post("reset")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body("token") token: string, @Body("newPassword") newPassword: string): Promise<void> {
    return this.passwordResetService.reset(token, newPassword);
  }
}