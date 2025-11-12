export interface MailVerificationType {
  id: string;
  email: string;
  user_id: string;
  token_hash: string;
  status: MailVerificationStatus;
  created_at: string;
  expires_at: string;
  verified_at: string;
}

export enum MailVerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  EXPIRED = "expired",
  REVOKED = "revoked",
}