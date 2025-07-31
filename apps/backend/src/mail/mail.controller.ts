import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendMailDto } from './dto/send-mail.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async send(@Body() dto: SendMailDto) {
    await this.mailService.sendMail(dto);
    return { message: 'Email sent' };
  }
}