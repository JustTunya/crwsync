import { RoleEnum } from "./role";

export interface UserType {
  id: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  birthdate: string;
  avatar_key: string | null;
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
  status_preference?: string;
}

export interface UserOperationState<T = undefined> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

export interface UpdateUserProfilePayload {
  firstname?: string;
  lastname?: string;
  username?: string;
  avatar_key?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface CloseAccountPayload {
  password: string;
}

export interface UserDataExport {
  exportedAt: string;
  profile: {
    id: string;
    email: string;
    username: string;
    firstname: string;
    lastname: string;
    birthdate: string;
    created_at: string;
  };
  workspaces: {
    name: string;
    slug: string;
    role: string;
    joined_at: string;
  }[];
  tasksCreated: {
    shortId: string;
    title: string;
    priority: string;
    workspace: string;
    created_at: string;
  }[];
  tasksAssigned: {
    shortId: string;
    title: string;
    priority: string;
    workspace: string;
  }[];
  comments: {
    content: string;
    task: string;
    created_at: string;
  }[];
  chatMessages: {
    content: string;
    room: string | null;
    created_at: string;
  }[];
  checklistItems: {
    content: string;
    isCompleted: boolean;
    task: string;
    created_at: string;
  }[];
}