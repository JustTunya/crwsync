export class SendEmailDto {
  to!: string;
  subject!: string;
  template!: string;
  context!: Record<string, unknown>;
}