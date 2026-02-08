import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { EmailService } from "src/email/email.service";
import { EmailController } from "src/email/email.controller";
import { emailConfig } from "src/email/email.config";
import { BullModule } from "@nestjs/bullmq";
import { EmailProcessor } from "src/email/email.processor";

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: emailConfig,
    }),
    BullModule.registerQueue({
      name: "email",
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService, BullModule],
})

export class EmailModule {}