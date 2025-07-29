import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AppService } from './app.service';
import { VerificationModule } from './verification/verification.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [DatabaseModule, UserModule, AuthModule, VerificationModule, MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
