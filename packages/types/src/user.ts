export interface UserType {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  avatar_key?: string;
  system_role_id: string;
  password_hash: string;
  last_password_change?: string;
  email_verified_at?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}