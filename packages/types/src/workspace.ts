export enum WorkspaceRoleEnum {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  GUEST = "GUEST",
}

export enum WorkspaceInviteStatusEnum {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined"
}

export interface WorkspaceUser {
  id: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  avatar_key: string | null;
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
  user?: WorkspaceUser;
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
  invitee_id: string;
  role: WorkspaceRoleEnum;
}

export interface WorkspaceInvite {
  id: string;
  role: WorkspaceRoleEnum;
  status: WorkspaceInviteStatusEnum;
  created_at: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  creator: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    avatar_key: string | null;
  };
}

export interface WorkspacePendingInvite {
  id: string;
  role: WorkspaceRoleEnum;
  status: WorkspaceInviteStatusEnum;
  created_at: string;
  invitee: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    avatar_key: string | null;
    email: string;
  };
  creator: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    avatar_key: string | null;
  };
}

export interface WorkspaceOperationState<T = undefined> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}