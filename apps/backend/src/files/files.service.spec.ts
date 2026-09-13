import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FilesService } from "./files.service";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";

describe("FilesService", () => {
  let service: FilesService;
  let prisma: {
    workspaceModule: { findFirst: jest.Mock; create: jest.Mock };
    fileRoom: { findFirst: jest.Mock; create: jest.Mock };
    workspaceFile: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; delete: jest.Mock };
    $transaction: jest.Mock;
  };
  let statusGateway: { server: { to: jest.Mock; emit: jest.Mock } };
  let storageService: { presignFileUpload: jest.Mock; deleteFileObject: jest.Mock };

  beforeEach(() => {
    prisma = {
      workspaceModule: { findFirst: jest.fn(), create: jest.fn() },
      fileRoom: { findFirst: jest.fn(), create: jest.fn() },
      workspaceFile: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };

    const emit = jest.fn();
    statusGateway = { server: { to: jest.fn().mockReturnValue({ emit }), emit } };

    storageService = {
      presignFileUpload: jest.fn(),
      deleteFileObject: jest.fn().mockResolvedValue(undefined),
    };

    service = new FilesService(
      prisma as unknown as PrismaService,
      statusGateway as unknown as StatusGateway,
      storageService as unknown as StorageService,
    );
  });

  describe("createRoom", () => {
    it("creates a room and module at the next position, then emits module:created", async () => {
      prisma.workspaceModule.findFirst.mockResolvedValue({ position: 1000 });
      const room = { id: "room-1", name: "Docs" };
      const wsModule = { id: "module-1", position: 2000 };
      prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
      prisma.fileRoom.create.mockResolvedValue(room);
      prisma.workspaceModule.create.mockResolvedValue(wsModule);

      const result = await service.createRoom("ws-1", { name: "Docs" });

      expect(prisma.workspaceModule.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 2000 }) }),
      );
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(statusGateway.server.to("workspace_ws-1").emit).toHaveBeenCalledWith("module:created", wsModule);
      expect(result).toEqual({ success: true, data: room });
    });

    it("uses the base position gap when no existing module", async () => {
      prisma.workspaceModule.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
      prisma.fileRoom.create.mockResolvedValue({ id: "room-1" });
      prisma.workspaceModule.create.mockResolvedValue({ id: "module-1", position: 1000 });

      await service.createRoom("ws-1", { name: "Docs" });

      expect(prisma.workspaceModule.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 1000 }) }),
      );
    });
  });

  describe("getRoom", () => {
    it("throws NotFoundException when room is missing", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue(null);
      await expect(service.getRoom("ws-1", "room-1")).rejects.toThrow(NotFoundException);
    });

    it("returns the room when found", async () => {
      const room = { id: "room-1" };
      prisma.fileRoom.findFirst.mockResolvedValue(room);
      const result = await service.getRoom("ws-1", "room-1");
      expect(result).toEqual({ success: true, data: room });
    });
  });

  describe("listFiles", () => {
    it("throws NotFoundException when room is missing", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue(null);
      await expect(service.listFiles("ws-1", "room-1")).rejects.toThrow(NotFoundException);
      expect(prisma.workspaceFile.findMany).not.toHaveBeenCalled();
    });

    it("returns files ordered newest first when room exists", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue({ id: "room-1" });
      const files = [{ id: "file-1" }];
      prisma.workspaceFile.findMany.mockResolvedValue(files);

      const result = await service.listFiles("ws-1", "room-1");

      expect(result).toEqual({ success: true, data: files });
    });
  });

  describe("presignUpload", () => {
    it("throws NotFoundException when room is missing", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue(null);
      await expect(service.presignUpload("ws-1", "room-1", "image/png", "a.png")).rejects.toThrow(
        NotFoundException,
      );
      expect(storageService.presignFileUpload).not.toHaveBeenCalled();
    });

    it("delegates to storageService when room exists", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue({ id: "room-1" });
      storageService.presignFileUpload.mockResolvedValue({ url: "http://upload", key: "room-1_abc.png" });

      const result = await service.presignUpload("ws-1", "room-1", "image/png", "a.png");

      expect(storageService.presignFileUpload).toHaveBeenCalledWith("image/png", "a.png", "room-1");
      expect(result).toEqual({ url: "http://upload", key: "room-1_abc.png" });
    });
  });

  describe("createFile", () => {
    it("throws NotFoundException when room is missing", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue(null);
      await expect(
        service.createFile("ws-1", "room-1", "user-1", {
          key: "room-1_abc.png",
          file_name: "a.png",
          file_size: 10,
          mime_type: "image/png",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when key does not belong to the room", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue({ id: "room-1" });

      await expect(
        service.createFile("ws-1", "room-1", "user-1", {
          key: "other-room_abc.png",
          file_name: "a.png",
          file_size: 10,
          mime_type: "image/png",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.workspaceFile.create).not.toHaveBeenCalled();
    });

    it("creates the file and emits file:created on success", async () => {
      prisma.fileRoom.findFirst.mockResolvedValue({ id: "room-1" });
      const file = { id: "file-1", key: "room-1_abc.png" };
      prisma.workspaceFile.create.mockResolvedValue(file);

      const result = await service.createFile("ws-1", "room-1", "user-1", {
        key: "room-1_abc.png",
        file_name: "a.png",
        file_size: 10,
        mime_type: "image/png",
      });

      expect(prisma.workspaceFile.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ uploaded_by: "user-1" }) }),
      );
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(result).toEqual({ success: true, data: file });
    });
  });

  describe("deleteFile", () => {
    it("throws NotFoundException when file is missing", async () => {
      prisma.workspaceFile.findFirst.mockResolvedValue(null);
      await expect(service.deleteFile("ws-1", "room-1", "file-1")).rejects.toThrow(NotFoundException);
      expect(prisma.workspaceFile.delete).not.toHaveBeenCalled();
      expect(storageService.deleteFileObject).not.toHaveBeenCalled();
    });

    it("deletes the file, removes the storage object, and emits file:deleted", async () => {
      prisma.workspaceFile.findFirst.mockResolvedValue({ id: "file-1", key: "room-1_abc.png" });
      prisma.workspaceFile.delete.mockResolvedValue({});

      const result = await service.deleteFile("ws-1", "room-1", "file-1");

      expect(prisma.workspaceFile.delete).toHaveBeenCalledWith({ where: { id: "file-1" } });
      expect(storageService.deleteFileObject).toHaveBeenCalledWith("room-1_abc.png");
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(result).toEqual({ success: true });
    });
  });
});
