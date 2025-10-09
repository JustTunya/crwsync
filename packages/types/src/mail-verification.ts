export interface MailVerificationType {
  id: string;
  email: string;
  user_id: string;
  token_hash: string;
  status: "pending" | "verified" | "expired" | "revoked";
  created_at: string;
  expires_at: string;
  verified_at: string;
}