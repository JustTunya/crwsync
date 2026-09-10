import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ModuleTypeEnum } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";
import { CreateFileRoomDto, CreateWorkspaceFileDto } from "src/files/dto/files.dto";
import { PresignedAvatarUpload } from "@crwsync/types";

const POSITION_GAP = 1000;

const UPLOADER_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  avatar_key: true,
};

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private statusGateway: StatusGateway,
    private storageService: StorageService,
  ) {}

  async createRoom(workspaceId: string, dto: CreateFileRoomDto) {
    const lastModule = await this.prisma.workspaceModule.findFirst({
      where: { workspace_id: workspaceId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (lastModule?.position ?? 0) + POSITION_GAP;

    const [room, wsModule] = await this.prisma.$transaction(async (tx) => {
      const room = await tx.fileRoom.create({
        data: {
          workspace_id: workspaceId,
          name: dto.name,
        },
      });

      const wsModule = await tx.workspaceModule.create({
        data: {
          workspace_id: workspaceId,
          project_id: dto.project_id || null,
          type: ModuleTypeEnum.FILES,
          reference_id: room.id,
          name: dto.name,
          position: nextPosition,
        },
      });

      return [room, wsModule];
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:created", wsModule);

    return { success: true, data: room };
  }

  async getRoom(workspaceId: string, roomId: string) {
    const room = await this.prisma.fileRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
    });
    if (!room) throw new NotFoundException("File room not found");

    return { success: true, data: room };
  }

  async listFiles(workspaceId: string, roomId: string) {
    const room = await this.prisma.fileRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException("File room not found");

    const files = await this.prisma.workspaceFile.findMany({
      where: { file_room_id: roomId },
      include: { uploader: { select: UPLOADER_SELECT } },
      orderBy: { created_at: "desc" },
    });

    return { success: true, data: files };
  }

  async presignUpload(
    workspaceId: string,
    roomId: string,
    contentType: string,
    fileName: string,
  ): Promise<PresignedAvatarUpload> {
    const room = await this.prisma.fileRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException("File room not found");

    return this.storageService.presignFileUpload(contentType, fileName, roomId);
  }

  async createFile(
    workspaceId: string,
    roomId: string,
    userId: string,
    dto: CreateWorkspaceFileDto,
  ) {
    const room = await this.prisma.fileRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException("File room not found");

    if (!dto.key.startsWith(`${roomId}_`)) {
      throw new BadRequestException("Invalid file key");
    }

    const file = await this.prisma.workspaceFile.create({
      data: {
        file_room_id: roomId,
        key: dto.key,
        file_name: dto.file_name,
        file_size: dto.file_size,
        mime_type: dto.mime_type,
        uploaded_by: userId,
      },
      include: { uploader: { select: UPLOADER_SELECT } },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("file:created", { roomId, file });

    return { success: true, data: file };
  }

  async deleteFile(workspaceId: string, roomId: string, fileId: string) {
    const file = await this.prisma.workspaceFile.findFirst({
      where: { id: fileId, file_room_id: roomId, room: { workspace_id: workspaceId } },
    });
    if (!file) throw new NotFoundException("File not found");

    await this.prisma.workspaceFile.delete({ where: { id: fileId } });
    await this.storageService.deleteFileObject(file.key);

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("file:deleted", { roomId, fileId });

    return { success: true };
  }
}
