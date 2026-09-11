import { ChatMessage } from "./chat";
import { TaskComment, TaskCommentAuthor } from "./board";

export enum NotificationTypeEnum {
  CHAT_MENTION = "CHAT_MENTION",
  TASK_COMMENT_MENTION = "TASK_COMMENT_MENTION",
  TASK_ASSIGNED = "TASK_ASSIGNED",
}

// Raw persisted row, as returned by GET /users/:userId/notifications.
export interface NotificationRecord {
  id: string;
  user_id: string;
  workspace_id: string;
  type: NotificationTypeEnum;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface AppNotificationBase {
  notificationId: string;
  isRead: boolean;
  createdAt: string;
}

export type ChatMentionNotification = AppNotificationBase & {
  type: NotificationTypeEnum.CHAT_MENTION;
  message: ChatMessage;
  room: { id: string; name: string | null };
  workspace: { slug: string; name: string };
};

export type TaskCommentMentionNotification = AppNotificationBase & {
  type: NotificationTypeEnum.TASK_COMMENT_MENTION;
  comment: TaskComment;
  task: { id: string; shortId: string; title: string };
  board: { id: string; name: string };
  workspace: { slug: string; name: string };
};

export type TaskAssignedNotification = AppNotificationBase & {
  type: NotificationTypeEnum.TASK_ASSIGNED;
  task: { id: string; shortId: string; title: string };
  board: { id: string; name: string };
  workspace: { slug: string; name: string };
  assignedBy: TaskCommentAuthor | null;
};

// The flat, card-ready shape every notification is normalized to on the client
// (REST rows unwrap `payload`; socket pushes already arrive flat).
export type AppNotification = ChatMentionNotification | TaskCommentMentionNotification | TaskAssignedNotification;
