import { create } from "zustand";
import type { ChatMessage, ChatReadReceipt } from "@crwsync/types";
import type { TypingUser } from "@/components/chat/TypingIndicator";

interface ChatStoreState {
  messages: Map<string, ChatMessage[]>;
  pendingMessages: Map<string, ChatMessage>;
  isConnected: boolean;
  replyingToMessage: ChatMessage | null;
  typingUsers: Map<string, TypingUser[]>;
  readReceipts: Map<string, Record<string, ChatReadReceipt>>;
}

interface ChatStoreActions {
  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  prependMessages: (roomId: string, messages: ChatMessage[]) => void;
  appendMessage: (roomId: string, message: ChatMessage) => void;
  addOptimistic: (roomId: string, message: ChatMessage, clientId: string) => void;
  confirmOptimistic: (clientId: string, serverMessage: ChatMessage) => void;
  rejectOptimistic: (clientId: string, roomId: string) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  setConnected: (connected: boolean) => void;
  clearRoom: (roomId: string) => void;
  setReplyingTo: (message: ChatMessage | null) => void;
  addTypingUser: (roomId: string, user: TypingUser) => void;
  removeTypingUser: (roomId: string, userId: string) => void;
  setReadReceipts: (roomId: string, receipts: ChatReadReceipt[]) => void;
  updateReadReceipt: (roomId: string, receipt: ChatReadReceipt) => void;
}

export const useChatStore = create<ChatStoreState & ChatStoreActions>((set) => ({
  messages: new Map(),
  pendingMessages: new Map(),
  isConnected: false,
  replyingToMessage: null,
  typingUsers: new Map(),
  readReceipts: new Map(),

  setReplyingTo: (message) => set({ replyingToMessage: message }),

  setMessages: (roomId, messages) =>
    set((state) => {
      const next = new Map(state.messages);
      next.set(roomId, messages);

      const nextReceipts = new Map(state.readReceipts);
      const roomReceipts: Record<string, ChatReadReceipt> = nextReceipts.get(roomId) || {};
      messages.forEach((m) => {
        if (m.read_receipts) {
          m.read_receipts.forEach((r) => {
            if (
              !roomReceipts[r.user_id] ||
              new Date(r.last_read_at) > new Date(roomReceipts[r.user_id].last_read_at)
            ) {
              roomReceipts[r.user_id] = r;
            }
          });
        }
      });
      nextReceipts.set(roomId, roomReceipts);

      return { messages: next, readReceipts: nextReceipts };
    }),

  prependMessages: (roomId, older) =>
    set((state) => {
      const next = new Map(state.messages);
      const existing = next.get(roomId) || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const filtered = older.filter((m) => !existingIds.has(m.id));
      next.set(roomId, [...filtered, ...existing]);
      return { messages: next };
    }),

  appendMessage: (roomId, message) =>
    set((state) => {
      const next = new Map(state.messages);
      const existing = next.get(roomId) || [];

      if (existing.some((m) => m.id === message.id)) {
        return state;
      }

      const pendingEntries = Array.from(state.pendingMessages.entries());
      const matchingPending = pendingEntries.find(
        ([, m]) => m.sender_id === message.sender_id && m.content === message.content && m.room_id === roomId,
      );

      if (matchingPending) {
        return state;
      }

      next.set(roomId, [...existing, message]);

      let nextReceipts = state.readReceipts;
      if (message.read_receipts && message.read_receipts.length > 0) {
        nextReceipts = new Map(state.readReceipts);
        const roomReceipts = { ...(nextReceipts.get(roomId) || {}) };
        message.read_receipts.forEach((r) => {
          if (!roomReceipts[r.user_id] || new Date(r.last_read_at) > new Date(roomReceipts[r.user_id].last_read_at)) {
            roomReceipts[r.user_id] = r;
          }
        });
        nextReceipts.set(roomId, roomReceipts);
      }

      return { messages: next, readReceipts: nextReceipts };
    }),

  addOptimistic: (roomId, message, clientId) =>
    set((state) => {
      const nextMessages = new Map(state.messages);
      const existing = nextMessages.get(roomId) || [];
      nextMessages.set(roomId, [...existing, message]);

      const nextPending = new Map(state.pendingMessages);
      nextPending.set(clientId, message);

      return { messages: nextMessages, pendingMessages: nextPending };
    }),

  confirmOptimistic: (clientId, serverMessage) =>
    set((state) => {
      const pending = state.pendingMessages.get(clientId);
      if (!pending) return state;

      const roomId = pending.room_id;
      const nextMessages = new Map(state.messages);
      const existing = nextMessages.get(roomId) || [];

      const updated = existing.map((m) =>
        m.id === pending.id ? serverMessage : m,
      );
      nextMessages.set(roomId, updated);

      const nextPending = new Map(state.pendingMessages);
      nextPending.delete(clientId);

      return { messages: nextMessages, pendingMessages: nextPending };
    }),

  rejectOptimistic: (clientId, roomId) =>
    set((state) => {
      const pending = state.pendingMessages.get(clientId);
      if (!pending) return state;

      const nextMessages = new Map(state.messages);
      const existing = nextMessages.get(roomId) || [];
      nextMessages.set(
        roomId,
        existing.filter((m) => m.id !== pending.id),
      );

      const nextPending = new Map(state.pendingMessages);
      nextPending.delete(clientId);

      return { messages: nextMessages, pendingMessages: nextPending };
    }),

  updateMessage: (roomId, messageId, updates) =>
    set((state) => {
      const nextMessages = new Map(state.messages);
      const existing = nextMessages.get(roomId) || [];

      let found = false;
      const updated = existing.map((m) => {
        let newReplyTo = m.reply_to;
        if (newReplyTo && newReplyTo.id === messageId) {
          if (updates.content !== undefined || updates.is_deleted !== undefined) {
             newReplyTo = { ...newReplyTo };
             if (updates.content !== undefined) newReplyTo.content = updates.content as string;
             if (updates.is_deleted !== undefined) newReplyTo.is_deleted = updates.is_deleted as boolean;
             found = true;
          }
        }

        if (m.id === messageId) {
          found = true;
          return { ...m, ...updates, reply_to: newReplyTo };
        }
        
        if (newReplyTo !== m.reply_to) {
          return { ...m, reply_to: newReplyTo };
        }

        return m;
      });

      if (found) {
        nextMessages.set(roomId, updated);
        return { messages: nextMessages };
      }
      return state;
    }),

  setConnected: (connected) => set({ isConnected: connected }),

  clearRoom: (roomId) =>
    set((state) => {
      const nextMessages = new Map(state.messages);
      nextMessages.delete(roomId);
      const nextTyping = new Map(state.typingUsers);
      nextTyping.delete(roomId);
      const nextReceipts = new Map(state.readReceipts);
      nextReceipts.delete(roomId);
      return { messages: nextMessages, typingUsers: nextTyping, readReceipts: nextReceipts };
    }),

  addTypingUser: (roomId, user) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      const existing = next.get(roomId) || [];
      if (!existing.find((u) => u.id === user.id)) {
        next.set(roomId, [...existing, user]);
      }
      return { typingUsers: next };
    }),

  removeTypingUser: (roomId, userId) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      const existing = next.get(roomId) || [];
      next.set(
        roomId,
        existing.filter((u) => u.id !== userId),
      );
      return { typingUsers: next };
    }),

  setReadReceipts: (roomId, receipts) =>
    set((state) => {
      const next = new Map(state.readReceipts);
      const roomReceipts = { ...(next.get(roomId) || {}) };
      receipts.forEach((r) => {
        if (
          !roomReceipts[r.user_id] ||
          new Date(r.last_read_at) > new Date(roomReceipts[r.user_id].last_read_at)
        ) {
          roomReceipts[r.user_id] = r;
        }
      });
      next.set(roomId, roomReceipts);
      return { readReceipts: next };
    }),

  updateReadReceipt: (roomId, receipt) =>
    set((state) => {
      const next = new Map(state.readReceipts);
      const roomReceipts = { ...(next.get(roomId) || {}) };
      roomReceipts[receipt.user_id] = receipt;
      next.set(roomId, roomReceipts);
      return { readReceipts: next };
    }),
}));
