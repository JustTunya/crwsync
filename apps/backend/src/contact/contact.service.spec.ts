import { ContactService } from "./contact.service";
import { EmailService } from "src/email/email.service";
import { ContactDto } from "src/contact/dto/contact.dto";

describe("ContactService", () => {
  let service: ContactService;
  let emailService: { sendEmail: jest.Mock };
  const originalContactEmail = process.env.CONTACT_EMAIL;

  beforeEach(() => {
    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    service = new ContactService(emailService as unknown as EmailService);
  });

  afterEach(() => {
    process.env.CONTACT_EMAIL = originalContactEmail;
  });

  it("sends the contact form to the configured contact email", async () => {
    process.env.CONTACT_EMAIL = "contact@example.com";
    const dto: ContactDto = { name: "Alex", email: "alex@example.com", message: "Hello there" };

    await service.submitContact(dto);

    expect(emailService.sendEmail).toHaveBeenCalledWith({
      to: "contact@example.com",
      subject: "New Contact from Alex",
      template: "./contact-form",
      context: { name: "Alex", email: "alex@example.com", message: "Hello there" },
    });
  });

  it("no-ops without sending an email when CONTACT_EMAIL is not configured", async () => {
    delete process.env.CONTACT_EMAIL;
    const dto: ContactDto = { name: "Alex", email: "alex@example.com", message: "Hello there" };

    await service.submitContact(dto);

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
