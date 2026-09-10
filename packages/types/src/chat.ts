export interface ChatRoom {
  id: string;
  workspace_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageSender {
  id: string;
  firstname: string;
  lastname: string;
  avatar_key: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: ChatMessageSender;
}

export interface ChatReadReceipt {
  id: string;
  room_id: string;
  user_id: string;
  message_id: string;
  last_read_at: string;
  user?: ChatMessageSender;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_edited: boolean;
  is_pinned: boolean;
  reply_to_id: string | null;
  client_id?: string;
  reply_to?: {
    id: string;
    content: string;
    is_deleted?: boolean;
    sender: { firstname: string; lastname: string };
  } | null;
  sender?: ChatMessageSender;
  reactions?: MessageReaction[];
  read_receipts?: ChatReadReceipt[];
  attachments?: ChatAttachment[];
}

export interface CreateChatRoomPayload {
  name: string;
  project_id?: string;
}

export interface CreateChatAttachmentPayload {
  key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export interface SendMessagePayload {
  content: string;
  client_id: string;
  reply_to_id?: string;
  isEveryoneMention?: boolean;
  mentionedUserIds?: string[];
  attachments?: CreateChatAttachmentPayload[];
}

export interface ToggleReactionPayload {
  message_id: string;
  emoji: string;
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface MentionNotification {
  /** Unique ID derived from the underlying ChatMessage id + a local uuid */
  notificationId: string;
  /** The chat message that contained the mention */
  message: ChatMessage;
  /** Room metadata so the frontend can build a link */
  room: { id: string; name: string | null };
  /** Workspace metadata for the navigation path */
  workspace: { slug: string; name: string };
  /** When the notification was received on the client */
  receivedAt: string;
}
