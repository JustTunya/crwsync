import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SendMailDto } from './dto/send-mail.dto';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(data: SendMailDto): Promise<void> {
    await this.mailerService.sendMail({
      to: data.to,
      subject: data.subject,
      template: data.template,
      context: data.context,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const url = `https://crwsync.com/verify/${token}`;

    await this.sendMail({
      to,
      subject: 'Verify your crwsync email',
      template: 'verify-email',
      context: {
        url,
        product: 'crwsync',
      },
    });
  }
}