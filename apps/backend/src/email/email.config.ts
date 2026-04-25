import { MailerOptions } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/adapters/handlebars.adapter";
import { resolve } from "path";

export const emailConfig = (): MailerOptions => ({
  transport: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || "587"), // TODO: Use 465 for secure connections
    secure: process.env.MAIL_PORT === "465",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  },
  defaults: {
    from: `"crwsync" <${process.env.MAIL_USER}>`,
  },
  template: {
    dir: resolve(__dirname, "../../../../packages/templates"),
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
});