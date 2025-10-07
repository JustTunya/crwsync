import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { resolve } from 'path';

export const emailConfig = (): MailerOptions => ({
  transport: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'), // TODO: Use 465 for secure connections
    secure: false, // TODO: Set to true if using port 465
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    }
  },
  defaults: {
    from: `"crwsync" <${process.env.MAIL_USER}>`,
  },
  template: {
    dir: resolve(__dirname, '../../../../packages/templates'),
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
});