import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(data: SendEmailDto): Promise<void> {
    await this.mailerService.sendMail({
      to: data.to,
      subject: data.subject,
      template: data.template,
      context: data.context,
    });
  }
}