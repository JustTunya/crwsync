import { Injectable } from "@nestjs/common";
import { EmailService } from "src/email/email.service";

@Injectable()
export class ClockService {
  constructor(private readonly emailService: EmailService) {}

  hasMailer(): boolean {
    return Boolean(this.emailService);
  }

  now(): Date {
    return new Date();
  }
}
