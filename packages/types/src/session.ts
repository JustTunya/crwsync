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

export interface ActiveSession {
  id: string;
  user_id: string;
  persistent: boolean;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  ua: string | null;
  ip: string | null;
  isCurrent: boolean;
}