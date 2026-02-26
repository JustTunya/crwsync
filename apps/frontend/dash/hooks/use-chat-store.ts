import { create } from "zustand";
import type { ChatMessage } from "@crwsync/types";

interface ChatStoreState {
  messages: Map<string, ChatMessage[]>;
  pendingMessages: Map<string, ChatMessage>;
  isConnected: boolean;
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
}

export const useChatStore = create<ChatStoreState & ChatStoreActions>((set) => ({
  messages: new Map(),
  pendingMessages: new Map(),
  isConnected: false,

  setMessages: (roomId, messages) =>
    set((state) => {
      const next = new Map(state.messages);
      next.set(roomId, messages);
      return { messages: next };
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
      return { messages: next };
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
        if (m.id === messageId) {
          found = true;
          return { ...m, ...updates };
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
      const next = new Map(state.messages);
      next.delete(roomId);
      return { messages: next };
    }),
}));
