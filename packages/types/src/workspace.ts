export enum WorkspaceRoleEnum {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  GUEST = "guest",
}

export enum WorkspaceInviteStatusEnum {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined"
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRoleEnum;
  joined_at: string;
  workspace?: Workspace;
}

export interface CreateWorkspacePayload {
  name: string;
  slug: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  logo_key?: string;
}

export interface InviteMemberPayload {
  username: string;
  role: WorkspaceRoleEnum;
}

export interface WorkspaceOperationState<T = undefined> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}