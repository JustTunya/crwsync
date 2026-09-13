import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../use-chat-store";
import type { ChatMessage, ChatReadReceipt } from "@crwsync/types";

function createMockMessage(id: string, content = "test", roomId = "room-1", clientId?: string): ChatMessage {
  return {
    id,
    workspace_id: "workspace-1",
    room_id: roomId,
    sender_id: "user-1",
    content,
    client_id: clientId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_edited: false,
    is_deleted: false,
    is_pinned: false,
    reply_to_id: null,
    reactions: [],
    read_receipts: [],
    attachments: [],
    sender: {
      id: "user-1",
      firstname: "Alice",
      lastname: "Smith",
      avatar_key: null,
    },
  };
}

describe("useChatStore", () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useChatStore.setState({
      messages: new Map(),
      pendingMessages: new Map(),
      isConnected: false,
      replyingToMessage: null,
      typingUsers: new Map(),
      readReceipts: new Map(),
    });
  });

  describe("setMessages & clearRoom", () => {
    it("sets messages for a room and extracts initial read receipts", () => {
      const receipt: ChatReadReceipt = {
        id: "r-1",
        room_id: "room-1",
        message_id: "m-1",
        user_id: "user-2",
        last_read_at: new Date("2026-01-01T12:00:00Z").toISOString(),
      };
      const msg = { ...createMockMessage("m-1"), read_receipts: [receipt] };

      useChatStore.getState().setMessages("room-1", [msg]);

      const state = useChatStore.getState();
      expect(state.messages.get("room-1")).toHaveLength(1);
      expect(state.readReceipts.get("room-1")?.["user-2"]).toEqual(receipt);
    });

    it("clears a room state cleanly", () => {
      useChatStore.getState().setMessages("room-1", [createMockMessage("m-1")]);
      useChatStore.getState().clearRoom("room-1");

      const state = useChatStore.getState();
      expect(state.messages.has("room-1")).toBe(false);
      expect(state.readReceipts.has("room-1")).toBe(false);
    });
  });

  describe("prependMessages", () => {
    it("prepends older messages and deduplicates existing IDs", () => {
      const existing = createMockMessage("m-2", "newer");
      const older = createMockMessage("m-1", "older");
      const duplicate = createMockMessage("m-2", "newer");

      useChatStore.getState().setMessages("room-1", [existing]);
      useChatStore.getState().prependMessages("room-1", [older, duplicate]);

      const msgs = useChatStore.getState().messages.get("room-1") || [];
      expect(msgs).toHaveLength(2);
      expect(msgs[0].id).toBe("m-1");
      expect(msgs[1].id).toBe("m-2");
    });
  });

  describe("Optimistic message pipeline", () => {
    it("adds an optimistic message and tracks it in pendingMessages", () => {
      const optMsg = createMockMessage("opt-1", "sending...", "room-1", "client-123");

      useChatStore.getState().addOptimistic("room-1", optMsg, "client-123");

      const state = useChatStore.getState();
      expect(state.messages.get("room-1")).toContainEqual(optMsg);
      expect(state.pendingMessages.get("client-123")).toEqual(optMsg);
    });

    it("confirms optimistic message: replaces temp message by client_id and removes from pending", () => {
      const optMsg = createMockMessage("opt-1", "sending...", "room-1", "client-123");
      useChatStore.getState().addOptimistic("room-1", optMsg, "client-123");

      const serverMsg = createMockMessage("srv-1", "sending...", "room-1", "client-123");
      useChatStore.getState().confirmOptimistic("client-123", serverMsg);

      const state = useChatStore.getState();
      const msgs = state.messages.get("room-1") || [];
      expect(msgs).toHaveLength(1);
      expect(msgs[0].id).toBe("srv-1");
      expect(state.pendingMessages.has("client-123")).toBe(false);
    });

    it("rejects optimistic message on error: removes from messages and clears pending", () => {
      const optMsg = createMockMessage("opt-1", "failing...", "room-1", "client-123");
      useChatStore.getState().addOptimistic("room-1", optMsg, "client-123");

      useChatStore.getState().rejectOptimistic("client-123", "room-1");

      const state = useChatStore.getState();
      expect(state.messages.get("room-1")).toHaveLength(0);
      expect(state.pendingMessages.has("client-123")).toBe(false);
    });
  });

  describe("appendMessage deduplication & reconciliation", () => {
    it("deduplicates incoming message if exact ID already exists", () => {
      const msg = createMockMessage("m-1");
      useChatStore.getState().setMessages("room-1", [msg]);
      useChatStore.getState().appendMessage("room-1", msg);

      expect(useChatStore.getState().messages.get("room-1")).toHaveLength(1);
    });

    it("reconciles optimistic message if incoming message carries matching client_id", () => {
      const optMsg = createMockMessage("opt-1", "optimistic text", "room-1", "client-abc");
      useChatStore.getState().addOptimistic("room-1", optMsg, "client-abc");

      const serverBroadcast = createMockMessage("srv-1", "optimistic text", "room-1", "client-abc");
      useChatStore.getState().appendMessage("room-1", serverBroadcast);

      const state = useChatStore.getState();
      const msgs = state.messages.get("room-1") || [];
      expect(msgs).toHaveLength(1);
      expect(msgs[0].id).toBe("srv-1");
      expect(state.pendingMessages.has("client-abc")).toBe(false);
    });
  });

  describe("appendMissedMessages (reconnection gap fill)", () => {
    it("merges missed messages and sorts chronologically to prevent timeline scramble", () => {
      const msg1 = { ...createMockMessage("m-1"), created_at: "2026-01-01T10:00:00Z" };
      const msg3 = { ...createMockMessage("m-3"), created_at: "2026-01-01T12:00:00Z" };
      const msg2 = { ...createMockMessage("m-2"), created_at: "2026-01-01T11:00:00Z" };

      useChatStore.getState().setMessages("room-1", [msg1, msg3]);
      useChatStore.getState().appendMissedMessages("room-1", [msg2, msg1]); // msg1 is duplicate

      const msgs = useChatStore.getState().messages.get("room-1") || [];
      expect(msgs).toHaveLength(3);
      expect(msgs.map((m) => m.id)).toEqual(["m-1", "m-2", "m-3"]);
    });
  });

  describe("updateMessage cascading", () => {
    it("updates message content and cascades the update to nested reply_to quotes", () => {
      const target = createMockMessage("m-1", "original text");
      const reply = {
        ...createMockMessage("m-2", "I agree"),
        reply_to: {
          id: target.id,
          content: target.content,
          is_deleted: target.is_deleted,
          sender: { firstname: target.sender!.firstname, lastname: target.sender!.lastname },
        },
      };

      useChatStore.getState().setMessages("room-1", [target, reply]);
      useChatStore.getState().updateMessage("room-1", "m-1", { content: "edited text", is_edited: true });

      const msgs = useChatStore.getState().messages.get("room-1") || [];
      expect(msgs[0].content).toBe("edited text");
      expect(msgs[0].is_edited).toBe(true);
      expect(msgs[1].reply_to?.content).toBe("edited text");
    });
  });

  describe("Typing indicators & read receipts", () => {
    it("adds and removes typing users correctly", () => {
      const typingUser = { id: "user-2", firstname: "Bob", lastname: "Roberts", avatar_key: null };

      useChatStore.getState().addTypingUser("room-1", typingUser);
      expect(useChatStore.getState().typingUsers.get("room-1")).toContainEqual(typingUser);

      // Prevent duplicate typing indicators
      useChatStore.getState().addTypingUser("room-1", typingUser);
      expect(useChatStore.getState().typingUsers.get("room-1")).toHaveLength(1);

      useChatStore.getState().removeTypingUser("room-1", "user-2");
      expect(useChatStore.getState().typingUsers.get("room-1")).toHaveLength(0);
    });

    it("updates read receipt only if the new timestamp is newer", () => {
      const olderReceipt: ChatReadReceipt = {
        id: "r-1",
        room_id: "room-1",
        message_id: "m-1",
        user_id: "user-2",
        last_read_at: new Date("2026-01-01T10:00:00Z").toISOString(),
      };
      const newerReceipt: ChatReadReceipt = {
        id: "r-2",
        room_id: "room-1",
        message_id: "m-2",
        user_id: "user-2",
        last_read_at: new Date("2026-01-01T12:00:00Z").toISOString(),
      };

      useChatStore.getState().updateReadReceipt("room-1", olderReceipt);
      expect(useChatStore.getState().readReceipts.get("room-1")?.["user-2"]).toEqual(olderReceipt);

      useChatStore.getState().updateReadReceipt("room-1", newerReceipt);
      expect(useChatStore.getState().readReceipts.get("room-1")?.["user-2"]).toEqual(newerReceipt);
    });
  });
});
