export interface SessionType {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at?: string;
  ip?: string;
  ua?: string;
}