import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationEntity } from 'src/email-verification/email-verification.entity';
import { VerificationService } from 'src/email-verification/email-verification.service';
import { VerificationController } from 'src/email-verification/email-verification.controller';
import { UserEntity } from 'src/user/user.entity';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationEntity]),
    TypeOrmModule.forFeature([UserEntity]),
    EmailModule
  ],
  providers: [VerificationService],
  controllers: [VerificationController],
  exports: [VerificationService]
})
export class VerificationModule {}