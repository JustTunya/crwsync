export enum TaskPriorityEnum {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum ModuleTypeEnum {
  BOARD = "BOARD",
  CHAT = "CHAT",
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  columns?: BoardColumn[];
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  shortId: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: TaskPriorityEnum;
  labels: string[];
  tags: string[];
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceModule {
  id: string;
  workspace_id: string;
  type: ModuleTypeEnum;
  reference_id: string;
  name: string;
  position: number;
  created_at: string;
  unreadCount?: number;
}

export interface CreateBoardPayload {
  name: string;
  description?: string;
}

export interface UpdateBoardPayload {
  name?: string;
  description?: string;
}

export interface CreateColumnPayload {
  name: string;
  color?: string;
}

export interface UpdateColumnPayload {
  name?: string;
  color?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriorityEnum;
  labels?: string[];
  tags?: string[];
  assignee_id?: string;
  due_date?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriorityEnum;
  labels?: string[];
  tags?: string[];
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface MoveTaskPayload {
  column_id: string;
  position: number;
}

export interface ReorderColumnsPayload {
  column_ids: string[];
}

export interface ReorderModulesPayload {
  module_ids: string[];
}

export interface BoardOperationState<T = undefined> {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}
