import { Prisma } from "@prisma/client";

export const userPublicSelect = {
  id: true,
  email: true,
  username: true,
  firstname: true,
  lastname: true,
  birthdate: true,
  avatar_key: true,
  role: true,
  role_version: true,
  last_password_change: true,
  email_verified_at: true,
  role_changed_at: true,
  last_login: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UserSelect;

export const userAuthSelect = {
  id: true,
  email: true,
  username: true,
  firstname: true,
  lastname: true,
  role: true,
  role_version: true,
  password_hash: true,
} satisfies Prisma.UserSelect;

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
export type UserAuth = Prisma.UserGetPayload<{ select: typeof userAuthSelect }>;

export const sessionPublicSelect = {
  id: true,
  user_id: true,
  persistent: true,
  created_at: true,
  expires_at: true,
  revoked_at: true,
  ua: true,
  ip: true,
} satisfies Prisma.SessionSelect;

export type SessionPublic = Prisma.SessionGetPayload<{ select: typeof sessionPublicSelect }>;

export const verificationPublicSelect = {
  id: true,
  email: true,
  user_id: true,
  status: true,
  created_at: true,
  expires_at: true,
  verified_at: true,
} satisfies Prisma.EmailVerificationSelect;

export type VerificationPublic = Prisma.EmailVerificationGetPayload<{ select: typeof verificationPublicSelect }>;

export const passwordResetPublicSelect = {
  id: true,
  email: true,
  user_id: true,
  status: true,
  created_at: true,
  expires_at: true,
  reset_at: true,
} satisfies Prisma.PasswordResetSelect;

export type PasswordResetPublic = Prisma.PasswordResetGetPayload<{ select: typeof passwordResetPublicSelect }>;