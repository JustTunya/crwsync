import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationEntity } from 'src/verification/verification.entity';
import { VerificationService } from 'src/verification/verification.service';
import { VerificationController } from 'src/verification/verification.controller';
import { UserEntity } from 'src/user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationEntity]),
    TypeOrmModule.forFeature([UserEntity])
  ],
  providers: [VerificationService],
  controllers: [VerificationController],
  exports: [VerificationService]
})
export class VerificationModule {}