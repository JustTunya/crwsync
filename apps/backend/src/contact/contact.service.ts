import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "src/email/email.service";
import { ContactDto } from "src/contact/dto/contact.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly emailService: EmailService) {}

  async submitContact(dto: ContactDto): Promise<void> {
    const contactEmail = process.env.CONTACT_EMAIL;
    
    if (!contactEmail) {
      this.logger.error("CONTACT_EMAIL is not defined in environment variables. Cannot send contact form submission.");
      return;
    }

    await this.emailService.sendEmail({
      to: contactEmail,
      subject: `New Contact from ${dto.name}`,
      template: "./contact-form",
      context: {
        name: dto.name,
        email: dto.email,
        message: dto.message,
      },
    });

    this.logger.log(`Contact message sent from ${dto.email} to admin.`);
  }
}
