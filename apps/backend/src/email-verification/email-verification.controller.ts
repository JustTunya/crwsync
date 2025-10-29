import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, Delete, Patch, ParseUUIDPipe, Query } from "@nestjs/common";
import { CreateVerificationDto } from "src/email-verification/dto/create-email-verification.dto";
import { UpdateVerificationDto } from "src/email-verification/dto/update-email-verification.dto";
import { VerificationService } from "src/email-verification/email-verification.service";
import { VerificationEntity } from "src/email-verification/email-verification.entity";

// @UseGuards(AuthGuard("jwt"))
@Controller("email-verifications")
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.create(dto);
  }

  @Get("verify")
  @HttpCode(HttpStatus.OK)
  async verify(@Query("token") token: string): Promise<VerificationEntity> {
    return this.verificationService.verifyEmail(token);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query("email") email?: string,
    @Query("token") token?: string
  ): Promise<VerificationEntity[]> {
    if (email) {
      const v = await this.verificationService.findByEmail(email);
      return v ? [v] : [];
    }
    if (token) {
      const v = await this.verificationService.findByToken(token);
      return v ? [v] : [];
    }

    return this.verificationService.findAll();
  }

  @Get(":verificationId")
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("verificationId", new ParseUUIDPipe({ version: "4" })) verificationId: string): Promise<VerificationEntity> {
    return this.verificationService.findOne(verificationId);
  }

  @Patch(":verificationId")
  @HttpCode(HttpStatus.OK)
  async update(@Param("verificationId", new ParseUUIDPipe({ version: "4" })) verificationId: string, @Body() dto: UpdateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.update(verificationId, dto);
  }

  @Delete(":verificationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("verificationId", new ParseUUIDPipe({ version: "4" })) verificationId: string): Promise<void> {
    await this.verificationService.remove(verificationId);
  }
}