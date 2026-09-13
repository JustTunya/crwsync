import { EmailService } from "./email.service";
import { MailerService } from "@nestjs-modules/mailer";
import { SendEmailDto } from "src/email/dto/send-email.dto";

describe("EmailService", () => {
  let service: EmailService;
  let mailerService: { sendMail: jest.Mock };

  beforeEach(() => {
    mailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new EmailService(mailerService as unknown as MailerService);
  });

  it("forwards to/subject/template/context to the mailer service", async () => {
    const dto: SendEmailDto = {
      to: "user@example.com",
      subject: "Welcome",
      template: "./welcome",
      context: { name: "Alex" },
    };

    await service.sendEmail(dto);

    expect(mailerService.sendMail).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Welcome",
      template: "./welcome",
      context: { name: "Alex" },
    });
  });

  it("propagates errors from the mailer service", async () => {
    mailerService.sendMail.mockRejectedValue(new Error("SMTP down"));

    await expect(
      service.sendEmail({ to: "user@example.com", subject: "Welcome", template: "./welcome", context: {} }),
    ).rejects.toThrow("SMTP down");
  });
});
