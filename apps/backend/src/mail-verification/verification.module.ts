import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationEntity } from 'src/mail-verification/verification.entity';
import { VerificationService } from 'src/mail-verification/verification.service';
import { VerificationController } from 'src/mail-verification/verification.controller';
import { UserEntity } from 'src/user/user.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationEntity]),
    TypeOrmModule.forFeature([UserEntity]),
    MailModule
  ],
  providers: [VerificationService],
  controllers: [VerificationController],
  exports: [VerificationService]
})
export class VerificationModule {}