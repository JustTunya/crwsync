import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, Delete, Patch, ParseUUIDPipe } from "@nestjs/common";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";
import { UpdatePasswordResetDto } from "src/password-reset/dto/update-password-reset.dto";
import { PasswordResetService } from "src/password-reset/password-reset.service";
import { PasswordResetEntity } from "src/password-reset/password-reset.entity";

// @UseGuards(AuthGuard("jwt"))
@Controller("password_resets")
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePasswordResetDto): Promise<PasswordResetEntity> {
    return this.passwordResetService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<PasswordResetEntity[]> {
    return this.passwordResetService.findAll();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<PasswordResetEntity> {
    return this.passwordResetService.findOne(id);
  }

  @Get("email/:email")
  @HttpCode(HttpStatus.OK)
  async findByEmail(@Param("email") email: string): Promise<PasswordResetEntity> {
    return this.passwordResetService.findByEmail(email);
  }

  @Get("token/:token")
  @HttpCode(HttpStatus.OK)
  async findByToken(@Param("token") token: string): Promise<PasswordResetEntity> {
    return this.passwordResetService.findByToken(token);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  async update(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: UpdatePasswordResetDto): Promise<PasswordResetEntity> {
    return this.passwordResetService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<void> {
    await this.passwordResetService.remove(id);
  }
}