export interface PasswordResetType {
  id: string;
  email: string;
  user_id: string;
  token_hash: string;
  status: PasswordResetStatus;
  created_at: string;
  expires_at: string;
  reset_at: string;
}

export enum PasswordResetStatus {
  PENDING = "pending",
  USED = "used",
  EXPIRED = "expired",
  REVOKED = "revoked",
}