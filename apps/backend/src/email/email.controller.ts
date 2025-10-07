import { Body, Controller, Post } from "@nestjs/common";
import { EmailService } from "src/email/email.service";
import { SendEmailDto } from "src/email/dto/send-email.dto";

@Controller("email")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send")
  async send(@Body() dto: SendEmailDto) {
    await this.emailService.sendEmail(dto);
    return { message: "Email sent" };
  }
}