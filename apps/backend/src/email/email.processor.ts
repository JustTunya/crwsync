import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { MailerService } from "@nestjs-modules/mailer";
import { Logger } from "@nestjs/common";
import { SendEmailDto } from "./dto/send-email.dto";

@Processor("email")
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<SendEmailDto, void, string>): Promise<void> {
    switch (job.name) {
      case "send-verification":
        await this.handleSendVerification(job.data);
        break;
      case "send-password-reset":
        await this.handleSendPasswordReset(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendVerification(data: SendEmailDto): Promise<void> {
    this.logger.log(`Sending verification email to ${data.to}`);
    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: data.subject,
        template: data.template,
        context: data.context,
      });
      this.logger.log(`Verification email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${data.to}`, (error as Error).stack);
      throw error; // Let BullMQ handle retries
    }
  }

  private async handleSendPasswordReset(data: SendEmailDto): Promise<void> {
    this.logger.log(`Sending password reset email to ${data.to}`);
    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: data.subject,
        template: data.template,
        context: data.context,
      });
      this.logger.log(`Password reset email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${data.to}`, (error as Error).stack);
      throw error;
    }
  }
}
