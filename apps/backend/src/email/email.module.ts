import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { EmailService } from "src/email/email.service";
import { EmailController } from "src/email/email.controller";
import { emailConfig } from "src/email/email.config";

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