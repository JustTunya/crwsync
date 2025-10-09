export interface PasswordResetType {
  id: string;
  email: string;
  user_id: string;
  token_hash: string;
  status: "pending" | "used" | "expired" | "revoked";
  created_at: string;
  expires_at: string;
  reset_at: string;
}