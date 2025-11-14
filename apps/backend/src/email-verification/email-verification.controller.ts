import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, Delete, Patch, ParseUUIDPipe, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { MailVerificationStatus, RoleEnum } from "@crwsync/types";
import { CreateVerificationDto } from "src/email-verification/dto/create-email-verification.dto";
import { UpdateVerificationDto } from "src/email-verification/dto/update-email-verification.dto";
import { VerificationService } from "src/email-verification/email-verification.service";
import { VerificationEntity } from "src/email-verification/email-verification.entity";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { Public } from "src/common/decorators/public.decorator";
import { Roles } from "src/common/decorators/roles.decorator";

@Controller("email-verifications")
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.create(dto);
  }

  @Public()
  @Get("verify")
  @HttpCode(HttpStatus.OK)
  async verify(@Query("token") token: string): Promise<{ success: boolean; message?: string }> {
    return this.verificationService.verifyEmail(token);
  }

  @Public()
  @Get("token-status")
  @HttpCode(HttpStatus.OK)
  async getTokenStatus(
    @Query("token") token: string
  ): Promise<{ status: MailVerificationStatus }> {
    return this.verificationService.getTokenStatus(token);
  }

  @Roles(RoleEnum.ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query("email") email?: string,
    @Query("token") token?: string
  ): Promise<VerificationEntity[]> {
    try {
      if (email) {
        const v = await this.verificationService.findByEmail(email);
        return [v];
      }
      if (token) {
        const v = await this.verificationService.findByToken(token);
        return [v];
      }
    } catch (err) {
      if (err instanceof NotFoundException) {
        return [];
      }
      throw err;
    }

    return this.verificationService.findAll();
  }

  @Roles(RoleEnum.ADMIN)
  @Get(":verificationId")
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("verificationId", new ParseUUIDPipe({ version: "4" })) verificationId: string): Promise<VerificationEntity> {
    return this.verificationService.findOne(verificationId);
  }

  @Roles(RoleEnum.ADMIN)
  @Patch(":verificationId")
  @HttpCode(HttpStatus.OK)
  async update(@Param("verificationId", new ParseUUIDPipe({ version: "4" })) verificationId: string, @Body() dto: UpdateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.update(verificationId, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(":verificationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("verificationId", new ParseUUIDPipe({ version: "4" })) verificationId: string): Promise<void> {
    await this.verificationService.remove(verificationId);
  }
}