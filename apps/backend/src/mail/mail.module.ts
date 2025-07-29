import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { mailConfig } from './mail.config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: mailConfig,
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})

export class MailModule {}