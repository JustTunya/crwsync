import { ChatService } from "./chat.service";
import {
  SendMessageDto,
  EditMessageDto,
  DeleteMessageDto,
  CreateChatRoomDto,
} from "src/chat/dto/chat.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";
import ogs from "open-graph-scraper";

jest.mock("open-graph-scraper", () => jest.fn());

describe("ChatService (Cluster 2 SSRF & Idempotency)", () => {
  let chatService: ChatService;
  let prisma: {
    chatMessage: {
      create: jest.Mock;
      upsert: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    chatReadReceipt: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    chatRoom: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
    workspaceMember: {
      findUnique: jest.Mock;
    };
    workspaceModule: {
      findFirst: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    messageReaction: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let statusGateway: {
    server: {
      to: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      chatMessage: {
        create: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      chatReadReceipt: {
        upsert: jest.fn().mockResolvedValue({ id: "receipt-1" }),
        deleteMany: jest.fn(),
      },
      chatRoom: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
      workspaceModule: {
        findFirst: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      messageReaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    statusGateway = {
      server: {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      },
    };

    chatService = new ChatService(
      prisma as unknown as PrismaService,
      statusGateway as unknown as StatusGateway,
      {} as unknown as StorageService,
    );
    jest.clearAllMocks();
  });

  describe("getLinkPreview SSRF protection", () => {
    it("returns { success: false, data: null } and avoids calling ogs for private IP", async () => {
      const result = await chatService.getLinkPreview("http://127.0.0.1:8080/secret");

      expect(result).toEqual({ success: false, data: null });
      expect(ogs).not.toHaveBeenCalled();
    });

    it("returns { success: false, data: null } and avoids calling ogs for cloud metadata", async () => {
      const result = await chatService.getLinkPreview("http://169.254.169.254/latest/meta-data");

      expect(result).toEqual({ success: false, data: null });
      expect(ogs).not.toHaveBeenCalled();
    });

    it("returns { success: false, data: null } and avoids calling ogs for non-http schemes", async () => {
      const result = await chatService.getLinkPreview("file:///etc/passwd");

      expect(result).toEqual({ success: false, data: null });
      expect(ogs).not.toHaveBeenCalled();
    });
  });

  describe("createMessage idempotency", () => {
    it("calls prisma.chatMessage.upsert when messageId is provided", async () => {
      const mockMessage = { id: "msg-1", read_receipts: [] };
      prisma.chatMessage.upsert.mockResolvedValue(mockMessage);

      const result = await chatService.createMessage(
        "ws-1",
        "room-1",
        "user-1",
        { content: "Hello world" } as unknown as SendMessageDto,
        "msg-1",
      );

      expect(prisma.chatMessage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg-1" },
          create: expect.objectContaining({ id: "msg-1", content: "Hello world" }),
          update: {},
        }),
      );
      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
      expect(result.id).toBe("msg-1");
    });

    it("calls prisma.chatMessage.create when messageId is omitted", async () => {
      const mockMessage = { id: "msg-generated", read_receipts: [] };
      prisma.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await chatService.createMessage(
        "ws-1",
        "room-1",
        "user-1",
        { content: "Hello world" } as unknown as SendMessageDto,
      );

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: "Hello world" }),
        }),
      );
      expect(prisma.chatMessage.upsert).not.toHaveBeenCalled();
      expect(result.id).toBe("msg-generated");
    });

    it("nested-creates attachments when the dto carries them", async () => {
      const mockMessage = { id: "msg-generated", read_receipts: [] };
      prisma.chatMessage.create.mockResolvedValue(mockMessage);

      await chatService.createMessage(
        "ws-1",
        "room-1",
        "user-1",
        {
          content: "",
          attachments: [
            { key: "room-1_abc.png", file_name: "a.png", file_size: 100, mime_type: "image/png" },
          ],
        } as unknown as SendMessageDto,
      );

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attachments: {
              createMany: {
                data: [
                  {
                    key: "room-1_abc.png",
                    file_name: "a.png",
                    file_size: 100,
                    mime_type: "image/png",
                    uploaded_by: "user-1",
                  },
                ],
              },
            },
          }),
        }),
      );
    });
  });

  describe("DM room access control", () => {
    const dmRoom = {
      id: "room-dm",
      workspace_id: "ws-1",
      is_direct: true,
      dm_user_a_id: "user-a",
      dm_user_b_id: "user-b",
    };
    const groupRoom = {
      id: "room-group",
      workspace_id: "ws-1",
      is_direct: false,
      dm_user_a_id: null,
      dm_user_b_id: null,
    };

    it("getRoom returns the room for a DM participant", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(dmRoom);

      const result = await chatService.getRoom("room-dm", "ws-1", "user-a");

      expect(prisma.chatRoom.findFirst).toHaveBeenCalledWith({
        where: { id: "room-dm", workspace_id: "ws-1" },
      });
      expect(result).toEqual({ success: true, data: dmRoom });
    });

    it("getRoom throws NotFoundException for a non-participant", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(dmRoom);

      await expect(chatService.getRoom("room-dm", "ws-1", "user-c")).rejects.toThrow(
        "Chat room not found",
      );
    });

    it("getRoom throws NotFoundException for a room in another workspace", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(null);

      await expect(chatService.getRoom("room-group", "ws-2", "user-c")).rejects.toThrow(
        "Chat room not found",
      );
    });

    it("getRoom allows any workspace member into a non-DM room", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(groupRoom);

      const result = await chatService.getRoom("room-group", "ws-1", "user-c");

      expect(result).toEqual({ success: true, data: groupRoom });
    });

    it("presignAttachment throws NotFoundException for a non-participant", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(dmRoom);

      await expect(
        chatService.presignAttachment("ws-1", "room-dm", "user-c", "image/png", "a.png"),
      ).rejects.toThrow("Chat room not found");
    });
  });

  describe("getOrCreateDm", () => {
    it("returns the existing room if one already exists for the sorted pair", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce({ id: "mem-2" });
      const existingRoom = { id: "room-existing", is_direct: true };
      prisma.chatRoom.findFirst.mockResolvedValue(existingRoom);

      const result = await chatService.getOrCreateDm("ws-1", "user-b", "user-a");

      expect(prisma.chatRoom.findFirst).toHaveBeenCalledWith({
        where: { workspace_id: "ws-1", is_direct: true, dm_user_a_id: "user-a", dm_user_b_id: "user-b" },
      });
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: existingRoom });
    });

    it("creates a new room and emits dm:room_created when none exists", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce({ id: "mem-2" });
      prisma.chatRoom.findFirst.mockResolvedValue(null);
      const newRoom = { id: "room-new", is_direct: true, dm_user_a_id: "user-a", dm_user_b_id: "user-b" };
      prisma.chatRoom.create.mockResolvedValue(newRoom);

      const result = await chatService.getOrCreateDm("ws-1", "user-a", "user-b");

      expect(prisma.chatRoom.create).toHaveBeenCalledWith({
        data: { workspace_id: "ws-1", is_direct: true, dm_user_a_id: "user-a", dm_user_b_id: "user-b" },
      });
      expect(statusGateway.server.to).toHaveBeenCalledWith("user_user-b");
      expect(result).toEqual({ success: true, data: newRoom });
    });

    it("throws NotFoundException if the other user is not a workspace member", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce(null);

      await expect(chatService.getOrCreateDm("ws-1", "user-a", "user-b")).rejects.toThrow(
        "User is not a member of this workspace",
      );
    });

    it("throws BadRequestException when starting a DM with yourself", async () => {
      await expect(chatService.getOrCreateDm("ws-1", "user-a", "user-a")).rejects.toThrow(
        "Cannot start a DM with yourself",
      );
    });

    it("marks the latest message as read when returning an existing DM room", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce({ id: "mem-2" });
      const existingRoom = { id: "room-existing", is_direct: true };
      prisma.chatRoom.findFirst.mockResolvedValue(existingRoom);
      prisma.chatMessage.findFirst.mockResolvedValue({ id: "msg-latest" });

      await chatService.getOrCreateDm("ws-1", "user-a", "user-b");

      expect(prisma.chatReadReceipt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ message_id: "msg-latest" }),
        }),
      );
    });
  });

  describe("createMessage mentions", () => {
    it("connects mentioned users when mentionedUserIds is provided", async () => {
      prisma.chatMessage.create.mockResolvedValue({ id: "msg-3", read_receipts: [] });

      await chatService.createMessage(
        "ws-1",
        "room-1",
        "user-1",
        { content: "hi", mentionedUserIds: ["user-2", "user-3"] } as unknown as SendMessageDto,
      );

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mentions: { connect: [{ id: "user-2" }, { id: "user-3" }] },
          }),
        }),
      );
    });
  });

  describe("createRoom", () => {
    it("creates a room and workspace module positioned after the last one, emitting module:created", async () => {
      prisma.workspaceModule.findFirst.mockResolvedValue({ position: 2000 });
      const room = { id: "room-1", name: "General" };
      const wsModule = { id: "module-1", position: 3000 };
      prisma.chatRoom.create.mockResolvedValue(room);
      prisma.workspaceModule.create.mockResolvedValue(wsModule);
      prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));

      const result = await chatService.createRoom("ws-1", "user-1", { name: "General" } as CreateChatRoomDto);

      expect(prisma.chatRoom.create).toHaveBeenCalledWith({
        data: { workspace_id: "ws-1", name: "General" },
      });
      expect(prisma.workspaceModule.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 3000 }) }),
      );
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(result).toEqual({ success: true, data: room });
    });

    it("defaults to the base position gap when no module exists yet", async () => {
      prisma.workspaceModule.findFirst.mockResolvedValue(null);
      prisma.chatRoom.create.mockResolvedValue({ id: "room-2" });
      prisma.workspaceModule.create.mockResolvedValue({ id: "module-2" });
      prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));

      await chatService.createRoom(
        "ws-1",
        "user-1",
        { name: "General", project_id: "proj-1" } as CreateChatRoomDto,
      );

      expect(prisma.workspaceModule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 1000, project_id: "proj-1" }),
        }),
      );
    });
  });

  describe("getMessages", () => {
    it("throws NotFoundException when the room does not exist", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(null);

      await expect(chatService.getMessages("room-1", "ws-1", "user-1")).rejects.toThrow(
        "Chat room not found",
      );
    });

    it("throws NotFoundException for a DM non-participant", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue({
        id: "room-dm",
        is_direct: true,
        dm_user_a_id: "user-a",
        dm_user_b_id: "user-b",
      });

      await expect(chatService.getMessages("room-dm", "ws-1", "user-c")).rejects.toThrow(
        "Chat room not found",
      );
    });

    it("returns messages in chronological order with no cursor", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue({
        id: "room-1",
        is_direct: false,
        dm_user_a_id: null,
        dm_user_b_id: null,
      });
      prisma.chatMessage.findMany.mockResolvedValue([
        { id: "m2", created_at: new Date("2024-01-02") },
        { id: "m1", created_at: new Date("2024-01-01") },
      ]);

      const result = await chatService.getMessages("room-1", "ws-1", "user-1");

      expect(result.data.has_more).toBe(false);
      expect(result.data.next_cursor).toBeNull();
      expect(result.data.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    });

    it("paginates with a cursor in the 'after' direction and reports next_cursor when more remain", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue({
        id: "room-1",
        is_direct: false,
        dm_user_a_id: null,
        dm_user_b_id: null,
      });
      const msgs = [
        { id: "m1", created_at: new Date("2024-01-01") },
        { id: "m2", created_at: new Date("2024-01-02") },
        { id: "m3", created_at: new Date("2024-01-03") },
      ];
      prisma.chatMessage.findMany.mockResolvedValue(msgs);

      const result = await chatService.getMessages(
        "room-1",
        "ws-1",
        "user-1",
        "2023-12-31T00:00:00.000Z",
        2,
        "after",
      );

      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            room_id: "room-1",
            created_at: { gt: new Date("2023-12-31T00:00:00.000Z") },
          }),
          orderBy: { created_at: "asc" },
          take: 3,
        }),
      );
      expect(result.data.has_more).toBe(true);
      expect(result.data.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
      expect(result.data.next_cursor).toBe(msgs[1].created_at.toISOString());
    });
  });

  describe("editMessage", () => {
    it("throws NotFoundException when the message does not exist", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue(null);

      await expect(
        chatService.editMessage("ws-1", "room-1", "user-1", {
          message_id: "m1",
          new_content: "hi",
        } as EditMessageDto),
      ).rejects.toThrow("Message not found");
    });

    it("throws NotFoundException when the message belongs to a different room", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        id: "m1",
        sender_id: "user-1",
        room_id: "room-2",
        workspace_id: "ws-1",
      });

      await expect(
        chatService.editMessage("ws-1", "room-1", "user-1", {
          message_id: "m1",
          new_content: "hi",
        } as EditMessageDto),
      ).rejects.toThrow("Message not found");
    });

    it("throws when editing someone else's message", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        id: "m1",
        sender_id: "user-2",
        room_id: "room-1",
        workspace_id: "ws-1",
      });

      await expect(
        chatService.editMessage("ws-1", "room-1", "user-1", {
          message_id: "m1",
          new_content: "hi",
        } as EditMessageDto),
      ).rejects.toThrow("Unauthorized to edit this message");
    });

    it("updates the content and marks the message edited", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        id: "m1",
        sender_id: "user-1",
        room_id: "room-1",
        workspace_id: "ws-1",
      });
      const updated = { id: "m1", content: "hi", is_edited: true };
      prisma.chatMessage.update.mockResolvedValue(updated);

      const result = await chatService.editMessage("ws-1", "room-1", "user-1", {
        message_id: "m1",
        new_content: "hi",
      } as EditMessageDto);

      expect(prisma.chatMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "m1" }, data: { content: "hi", is_edited: true } }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe("deleteMessage", () => {
    it("throws NotFoundException when the message does not exist", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue(null);

      await expect(
        chatService.deleteMessage("ws-1", "room-1", "user-1", { message_id: "m1" } as DeleteMessageDto),
      ).rejects.toThrow("Message not found");
    });

    it("throws when deleting someone else's message", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        id: "m1",
        sender_id: "user-2",
        room_id: "room-1",
        workspace_id: "ws-1",
      });

      await expect(
        chatService.deleteMessage("ws-1", "room-1", "user-1", { message_id: "m1" } as DeleteMessageDto),
      ).rejects.toThrow("Unauthorized to delete this message");
    });

    it("soft-deletes the message and replaces its content", async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({
        id: "m1",
        sender_id: "user-1",
        room_id: "room-1",
        workspace_id: "ws-1",
      });
      const updated = { id: "m1", is_deleted: true, content: "This message was deleted." };
      prisma.chatMessage.update.mockResolvedValue(updated);

      const result = await chatService.deleteMessage("ws-1", "room-1", "user-1", {
        message_id: "m1",
      } as DeleteMessageDto);

      expect(prisma.chatMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { is_deleted: true, content: "This message was deleted." } }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe("deleteRoom", () => {
    it("deletes all room data in a transaction and emits module:deleted", async () => {
      prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));

      const result = await chatService.deleteRoom("ws-1", "room-1");

      expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({ where: { room_id: "room-1" } });
      expect(prisma.chatRoom.delete).toHaveBeenCalledWith({ where: { id: "room-1" } });
      expect(prisma.workspaceModule.deleteMany).toHaveBeenCalledWith({
        where: { workspace_id: "ws-1", reference_id: "room-1" },
      });
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("listDms", () => {
    it("computes unread status and drops rooms whose participant record is missing", async () => {
      const rooms = [
        {
          id: "room-1",
          workspace_id: "ws-1",
          name: null,
          is_direct: true,
          dm_user_a_id: "user-1",
          dm_user_b_id: "user-2",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          messages: [{ created_at: new Date("2024-01-05") }],
          read_receipts: [{ last_read_at: new Date("2024-01-01") }],
        },
        {
          id: "room-2",
          workspace_id: "ws-1",
          name: null,
          is_direct: true,
          dm_user_a_id: "user-3",
          dm_user_b_id: "user-1",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          messages: [],
          read_receipts: [],
        },
        {
          id: "room-3",
          workspace_id: "ws-1",
          name: null,
          is_direct: true,
          dm_user_a_id: "user-1",
          dm_user_b_id: "user-4",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          messages: [],
          read_receipts: [],
        },
      ];
      prisma.chatRoom.findMany.mockResolvedValue(rooms);
      prisma.user.findMany.mockResolvedValue([
        { id: "user-2", firstname: "A", lastname: "B", avatar_key: null },
        { id: "user-4", firstname: "C", lastname: "D", avatar_key: null },
      ]);

      const result = await chatService.listDms("ws-1", "user-1");

      expect(result.data).toHaveLength(2);
      const byRoomId = new Map(result.data.map((dm) => [dm.room.id, dm]));
      expect(byRoomId.get("room-1")?.unread).toBe(true);
      expect(byRoomId.get("room-3")?.unread).toBe(false);
      expect(byRoomId.has("room-2")).toBe(false);
    });
  });

  describe("toggleReaction", () => {
    it("throws NotFoundException when the message is not in this room", async () => {
      prisma.chatMessage.findUnique.mockResolvedValueOnce(null);

      await expect(
        chatService.toggleReaction("ws-1", "room-1", "user-1", "m1", "👍"),
      ).rejects.toThrow("Message not found");
    });

    it("creates a reaction when none exists yet", async () => {
      prisma.chatMessage.findUnique
        .mockResolvedValueOnce({ room_id: "room-1", workspace_id: "ws-1" })
        .mockResolvedValueOnce({ id: "m1", reactions: [{ emoji: "👍" }] });
      prisma.messageReaction.findUnique.mockResolvedValue(null);

      const result = await chatService.toggleReaction("ws-1", "room-1", "user-1", "m1", "👍");

      expect(prisma.messageReaction.create).toHaveBeenCalledWith({
        data: { message_id: "m1", user_id: "user-1", emoji: "👍" },
      });
      expect(prisma.messageReaction.delete).not.toHaveBeenCalled();
      expect(prisma.messageReaction.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: "m1", reactions: [{ emoji: "👍" }] });
    });

    it("removes the reaction when toggled with the same emoji", async () => {
      prisma.chatMessage.findUnique
        .mockResolvedValueOnce({ room_id: "room-1", workspace_id: "ws-1" })
        .mockResolvedValueOnce({ id: "m1", reactions: [] });
      prisma.messageReaction.findUnique.mockResolvedValue({ id: "reaction-1", emoji: "👍" });

      await chatService.toggleReaction("ws-1", "room-1", "user-1", "m1", "👍");

      expect(prisma.messageReaction.delete).toHaveBeenCalledWith({ where: { id: "reaction-1" } });
      expect(prisma.messageReaction.create).not.toHaveBeenCalled();
      expect(prisma.messageReaction.update).not.toHaveBeenCalled();
    });

    it("updates the emoji when reacting again with a different emoji", async () => {
      prisma.chatMessage.findUnique
        .mockResolvedValueOnce({ room_id: "room-1", workspace_id: "ws-1" })
        .mockResolvedValueOnce({ id: "m1", reactions: [] });
      prisma.messageReaction.findUnique.mockResolvedValue({ id: "reaction-1", emoji: "👍" });

      await chatService.toggleReaction("ws-1", "room-1", "user-1", "m1", "🎉");

      expect(prisma.messageReaction.update).toHaveBeenCalledWith({
        where: { id: "reaction-1" },
        data: { emoji: "🎉" },
      });
      expect(prisma.messageReaction.create).not.toHaveBeenCalled();
      expect(prisma.messageReaction.delete).not.toHaveBeenCalled();
    });
  });

  describe("getLinkPreview success path", () => {
    it("maps og fields for a public IP-literal URL", async () => {
      (ogs as unknown as jest.Mock).mockResolvedValue({
        result: {
          requestUrl: "http://8.8.8.8/",
          ogTitle: "Title",
          ogDescription: "Desc",
          ogImage: [{ url: "http://8.8.8.8/img.png" }],
        },
      });

      const result = await chatService.getLinkPreview("http://8.8.8.8/page");

      expect(result).toEqual({
        success: true,
        data: { url: "http://8.8.8.8/", title: "Title", description: "Desc", image: "http://8.8.8.8/img.png" },
      });
    });

    it("falls back to twitter fields and a null image when og fields are absent", async () => {
      (ogs as unknown as jest.Mock).mockResolvedValue({
        result: {
          twitterTitle: "TwTitle",
          twitterDescription: "TwDesc",
        },
      });

      const result = await chatService.getLinkPreview("http://8.8.8.8/page");

      expect(result).toEqual({
        success: true,
        data: { url: "http://8.8.8.8/page", title: "TwTitle", description: "TwDesc", image: null },
      });
    });

    it("returns success:false when the scraper throws for an otherwise-public URL", async () => {
      (ogs as unknown as jest.Mock).mockRejectedValue(new Error("network error"));

      const result = await chatService.getLinkPreview("http://8.8.8.8/page");

      expect(result).toEqual({ success: false, data: null });
    });
  });
});
