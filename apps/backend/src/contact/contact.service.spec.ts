import { ContactService } from "./contact.service";
import { EmailService } from "src/email/email.service";
import { ContactDto } from "src/contact/dto/contact.dto";

describe("ContactService", () => {
  let service: ContactService;
  let emailService: { sendEmail: jest.Mock };
  const originalAdminMail = process.env.ADMIN_MAIL;

  beforeEach(() => {
    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    service = new ContactService(emailService as unknown as EmailService);
  });

  afterEach(() => {
    process.env.ADMIN_MAIL = originalAdminMail;
  });

  it("sends the contact form to the configured admin email", async () => {
    process.env.ADMIN_MAIL = "admin@example.com";
    const dto: ContactDto = { name: "Alex", email: "alex@example.com", message: "Hello there" };

    await service.submitContact(dto);

    expect(emailService.sendEmail).toHaveBeenCalledWith({
      to: "admin@example.com",
      subject: "New Contact from Alex",
      template: "./contact-form",
      context: { name: "Alex", email: "alex@example.com", message: "Hello there" },
    });
  });

  it("no-ops without sending an email when ADMIN_MAIL is not configured", async () => {
    delete process.env.ADMIN_MAIL;
    const dto: ContactDto = { name: "Alex", email: "alex@example.com", message: "Hello there" };

    await service.submitContact(dto);

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
