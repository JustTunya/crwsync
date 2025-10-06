import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AppService } from './app.service';
import { VerificationModule } from './mail-verification/verification.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [HealthModule, DatabaseModule, UserModule, AuthModule, VerificationModule, MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
