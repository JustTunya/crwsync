import { Body, Controller, Get, Param, Post, Put, HttpCode, HttpStatus, Delete, Patch } from '@nestjs/common';
import { CreateVerificationDto } from 'src/verification/dto/create-verification.dto';
import { UpdateVerificationDto } from 'src/verification/dto/update-verification.dto';
import { VerificationService } from 'src/verification/verification.service';
import { VerificationEntity } from 'src/verification/verification.entity';

// @UseGuards(AuthGuard('jwt'))
@Controller('email_verifications')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.create(dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body('token') token: string): Promise<VerificationEntity> {
    return this.verificationService.verify(token);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<VerificationEntity[]> {
    return this.verificationService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<VerificationEntity> {
    return this.verificationService.findOne(id);
  }

  @Get('email/:email')
  @HttpCode(HttpStatus.OK)
  async findByEmail(@Param('email') email: string): Promise<VerificationEntity> {
    return this.verificationService.findByEmail(email);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.verificationService.remove(id);
  }
}