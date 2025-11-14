import { RoleEnum } from "./role";

export interface UserType {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  avatar_key?: string;
  role: RoleEnum;
  role_version: number;
  password_hash: string;
  last_password_change?: string;
  last_role_change?: string;
  email_verified_at?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionUserType {
  id: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  avatar_key?: string;
  role: RoleEnum;
  role_version: number;
}