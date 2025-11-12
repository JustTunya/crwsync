import { RoleEnum } from "@crwsync/types";

export interface ActiveUser {
  userId: string;
  sessionId: string;
  email: string;
  role: RoleEnum;
  roleVersion: number;
}