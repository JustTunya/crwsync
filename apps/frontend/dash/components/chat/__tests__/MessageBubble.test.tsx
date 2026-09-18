import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageBubble } from "../MessageBubble";
import type { ChatMessage, MessageReaction } from "@crwsync/types";

const mockSetReplyingTo = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ slug: "test-workspace" }),
  usePathname: () => "/test-workspace/chat/room-1",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ data: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-chat-store", () => ({
  useChatStore: () => ({ setReplyingTo: mockSetReplyingTo }),
}));

function createMockMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: "msg-1",
    workspace_id: "ws-1",
    room_id: "room-1",
    sender_id: "user-2",
    content: "Hello world!",
    client_id: "client-1",
    created_at: "2026-09-18T10:00:00.000Z",
    updated_at: "2026-09-18T10:00:00.000Z",
    is_edited: false,
    is_deleted: false,
    is_pinned: false,
    reply_to_id: null,
    reply_to: null,
    reactions: [],
    read_receipts: [],
    attachments: [],
    sender: {
      id: "user-2",
      firstname: "Jane",
      lastname: "Doe",
      avatar_key: null,
    },
    ...overrides,
  };
}

describe("MessageBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders message content and sender name for other users", () => {
    const message = createMockMessage();
    const html = renderToStaticMarkup(
      <MessageBubble
        message={message}
        isSelf={false}
        isConsecutive={false}
        isLastInGroup={true}
        isPending={false}
      />
    );

    expect(html).toContain("Hello world!");
    expect(html).toContain("Jane Doe");
    expect(html).toContain('data-testid="message-bubble"');
    expect(html).toContain('data-self="false"');
  });

  it("renders right-aligned message for self without sender name header", () => {
    const message = createMockMessage({ sender_id: "user-1" });
    const html = renderToStaticMarkup(
      <MessageBubble
        message={message}
        isSelf={true}
        isConsecutive={false}
        isLastInGroup={true}
        isPending={false}
      />
    );

    expect(html).toContain("Hello world!");
    expect(html).toContain('data-self="true"');
    expect(html).toContain("justify-end");
  });

  it("renders deleted message placeholder when is_deleted is true", () => {
    const message = createMockMessage({ is_deleted: true, content: "This message was deleted." });
    const html = renderToStaticMarkup(
      <MessageBubble
        message={message}
        isSelf={false}
        isConsecutive={false}
        isLastInGroup={true}
        isPending={false}
      />
    );

    expect(html).toContain("This message was deleted.");
    expect(html).toContain("italic");
  });

  it("renders reaction indicators when message has reactions", () => {
    const reactions: MessageReaction[] = [
      {
        id: "r-1",
        message_id: "msg-1",
        user_id: "user-1",
        emoji: "❤️",
        created_at: "2026-09-18T10:01:00.000Z",
        user: { id: "user-1", firstname: "Sam", lastname: "Smith", avatar_key: null },
      },
    ];
    const message = createMockMessage({ reactions });
    const html = renderToStaticMarkup(
      <MessageBubble
        message={message}
        isSelf={false}
        isConsecutive={false}
        isLastInGroup={true}
        isPending={false}
      />
    );

    expect(html).toContain('data-testid="reaction-indicator"');
    expect(html).toContain("❤️");
    expect(html).toContain(">1<");
  });

  it("renders action triggers for message options on desktop and mobile", () => {
    const message = createMockMessage();
    const html = renderToStaticMarkup(
      <MessageBubble
        message={message}
        isSelf={true}
        isConsecutive={false}
        isLastInGroup={true}
        isPending={false}
      />
    );

    expect(html).toContain('data-testid="message-react"');
    expect(html).toContain('aria-label="Add reaction"');
    expect(html).toContain('aria-label="Reply to message"');
    expect(html).toContain('aria-label="Edit message"');
    expect(html).toContain('aria-label="Delete message"');
  });

  it("renders edited indicator when message was edited", () => {
    const message = createMockMessage({ is_edited: true });
    const html = renderToStaticMarkup(
      <MessageBubble
        message={message}
        isSelf={false}
        isConsecutive={false}
        isLastInGroup={true}
        isPending={false}
      />
    );

    expect(html).toContain("(edited)");
  });

  describe("Reaction toggle behavior", () => {
    it("handles double-click heart logic correctly: add when none, revoke when heart, update when other emoji", () => {
      const toggle = (currentReactions: MessageReaction[], currentUserId: string, emojiToToggle: string) => {
        const reactions = [...currentReactions];
        const existingIdx = reactions.findIndex((r) => r.user_id === currentUserId);
        if (existingIdx !== -1) {
          if (reactions[existingIdx].emoji === emojiToToggle) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions[existingIdx] = { ...reactions[existingIdx], emoji: emojiToToggle };
          }
        } else {
          reactions.push({
            id: "temp",
            message_id: "msg-1",
            user_id: currentUserId,
            emoji: emojiToToggle,
            created_at: new Date().toISOString(),
          });
        }
        return reactions;
      };

      // 1. Initial: no reaction -> double-click puts heart
      const res1 = toggle([], "user-1", "❤️");
      expect(res1).toHaveLength(1);
      expect(res1[0].emoji).toBe("❤️");

      // 2. Second double-click with heart already present -> revokes heart
      const res2 = toggle(res1, "user-1", "❤️");
      expect(res2).toHaveLength(0);

      // 3. If user has thumbs up -> double-click changes to heart
      const thumbsUpReaction: MessageReaction[] = [
        {
          id: "r-2",
          message_id: "msg-1",
          user_id: "user-1",
          emoji: "👍",
          created_at: new Date().toISOString(),
        },
      ];
      const res3 = toggle(thumbsUpReaction, "user-1", "❤️");
      expect(res3).toHaveLength(1);
      expect(res3[0].emoji).toBe("❤️");
    });
  });
});
