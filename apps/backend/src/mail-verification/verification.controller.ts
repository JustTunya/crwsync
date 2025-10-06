import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, Delete, Patch, ParseUUIDPipe } from '@nestjs/common';
import { CreateVerificationDto } from 'src/mail-verification/dto/create-verification.dto';
import { UpdateVerificationDto } from 'src/mail-verification/dto/update-verification.dto';
import { VerificationService } from 'src/mail-verification/verification.service';
import { VerificationEntity } from 'src/mail-verification/verification.entity';

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
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<VerificationEntity> {
    return this.verificationService.findOne(id);
  }

  @Get('email/:email')
  @HttpCode(HttpStatus.OK)
  async findByEmail(@Param('email') email: string): Promise<VerificationEntity> {
    return this.verificationService.findByEmail(email);
  }

  @Get('token/:token')
  @HttpCode(HttpStatus.OK)
  async findByToken(@Param('token') token: string): Promise<VerificationEntity> {
    return this.verificationService.findByToken(token);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UpdateVerificationDto): Promise<VerificationEntity> {
    return this.verificationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    await this.verificationService.remove(id);
  }
}