import { Body, Controller, Post } from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";
import { EmailService } from "src/email/email.service";
import { SendEmailDto } from "src/email/dto/send-email.dto";
import { Roles } from "src/common/decorators/roles.decorator";

@Controller("email")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Roles(RoleEnum.ADMIN)
  @Post("send")
  async send(@Body() dto: SendEmailDto) {
    await this.emailService.sendEmail(dto);
    return { message: "Email sent" };
  }
}