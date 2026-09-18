import { ModuleTypeEnum, TaskPriorityEnum, ColumnType } from "./board";

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
  slug?: string;
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

export interface WorkspaceHomeSummary {
  greeting: string;
  todayFormatted: string;
  urgentCount: number;
  activeTasksCount: number;
  completionVelocity: number;
  workspaceMembersCount: number;
}

export interface HomeTaskItem {
  id: string;
  shortId: string;
  title: string;
  priority: TaskPriorityEnum;
  status: string;
  columnId: string;
  boardId: string;
  boardTitle: string;
  projectId?: string;
  projectName?: string;
  dueDate: string | null;
  commentsCount: number;
  attachmentsCount: number;
  checklistTotal: number;
  checklistCompleted: number;
  columnColor?: string | null;
  columnType?: ColumnType;
  completedAt?: string | null;
}

export interface HomeProjectSummary {
  id: string;
  title: string;
  color?: string | null;
  boardId?: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
  }>;
}

export interface HomePinnedModule {
  id: string;
  name: string;
  type: ModuleTypeEnum;
  isPinned: boolean;
  color?: string | null;
  badgeCount?: number;
  lastActive?: string;
}

export interface HomeActivityItem {
  id: string;
  type: "task_created" | "task_moved" | "task_completed" | "comment_added" | "file_uploaded";
  message: string;
  actor: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  target: {
    id: string;
    title: string;
    href: string;
  };
  createdAt: string;
}

export interface HomeMemberPresence {
  id: string;
  name: string;
  role: WorkspaceRoleEnum;
  avatarUrl?: string | null;
  isOnline: boolean;
  activeStatus?: string;
}

export interface WorkspaceHomeData {
  summary: WorkspaceHomeSummary;
  myFocus: {
    overdue: HomeTaskItem[];
    dueToday: HomeTaskItem[];
    inProgress: HomeTaskItem[];
  };
  projects: HomeProjectSummary[];
  pinnedModules: HomePinnedModule[];
  recentActivity: HomeActivityItem[];
  crew: HomeMemberPresence[];
}