import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { emailConfig } from './email.config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: emailConfig,
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})

export class EmailModule {}