import { ChatService } from "./chat.service";
import { SendMessageDto } from "src/chat/dto/chat.dto";
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
    };
    chatReadReceipt: {
      upsert: jest.Mock;
    };
    chatRoom: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
    };
    workspaceMember: {
      findUnique: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
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
      },
      chatReadReceipt: {
        upsert: jest.fn().mockResolvedValue({ id: "receipt-1" }),
      },
      chatRoom: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
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
  });
});
