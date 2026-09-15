import { Task, ColumnType, TaskPriorityEnum } from "./board";
import { UserPublic } from "./user";

export type ScheduleScope = "assigned_to_me" | "created_by_me" | "all";

export interface ScheduleCounts {
  overdue: number;
  today: number;
  thisWeek: number;
  completedThisWeek: number;
  total: number;
}

export interface ScheduleTask extends Task {
  column: {
    id: string;
    name: string;
    type: ColumnType;
    color: string | null;
    board_id: string;
  };
  board: {
    id: string;
    name: string;
  };
  assignee: UserPublic | null;
  _count?: {
    comments: number;
    checklistItems: number;
  };
}

export interface ScheduleFilters {
  scope?: ScheduleScope;
  boardId?: string;
  priority?: TaskPriorityEnum;
  includeCompleted?: boolean;
  from?: string;
  to?: string;
}

export interface ScheduleResponse {
  tasks: ScheduleTask[];
  counts: ScheduleCounts;
}
