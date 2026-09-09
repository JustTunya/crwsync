import { ChatService } from "./chat.service";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
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
    };

    statusGateway = {
      server: {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      },
    };

    chatService = new ChatService(
      prisma as unknown as PrismaService,
      statusGateway as unknown as StatusGateway,
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
        { content: "Hello world" } as any,
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
        { content: "Hello world" } as any,
      );

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: "Hello world" }),
        }),
      );
      expect(prisma.chatMessage.upsert).not.toHaveBeenCalled();
      expect(result.id).toBe("msg-generated");
    });
  });
});
