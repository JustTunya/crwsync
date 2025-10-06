export interface MailVerification {
  id: string;
  email: string;
  user_id: string;
  token: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
}