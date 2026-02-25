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
  reply_to: string | null;
  sender?: ChatMessageSender;
}

export interface CreateChatRoomPayload {
  name: string;
}

export interface SendMessagePayload {
  content: string;
  client_id: string;
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  next_cursor: string | null;
  has_more: boolean;
}
