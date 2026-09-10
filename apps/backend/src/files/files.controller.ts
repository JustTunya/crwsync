import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { FilesService } from "src/files/files.service";
import { CreateFileRoomDto, CreateWorkspaceFileDto } from "src/files/dto/files.dto";
import { PresignFileDto } from "src/storage/dto/presign-file.dto";
import { PresignedAvatarUpload } from "@crwsync/types";

@Controller("workspaces/:workspaceId/file-rooms")
@UseGuards(IsMemberGuard)
@SkipThrottle()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  create(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Body() dto: CreateFileRoomDto,
  ) {
    return this.filesService.createRoom(workspaceId, dto);
  }

  @Get(":roomId")
  findOne(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
  ) {
    return this.filesService.getRoom(workspaceId, roomId);
  }

  @Get(":roomId/files")
  listFiles(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
  ) {
    return this.filesService.listFiles(workspaceId, roomId);
  }

  @Post(":roomId/files/presign")
  @Throttle({ default: { ttl: 3600, limit: 60 } })
  presign(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @Body() dto: PresignFileDto,
  ): Promise<PresignedAvatarUpload> {
    return this.filesService.presignUpload(workspaceId, roomId, dto.contentType, dto.fileName);
  }

  @Post(":roomId/files")
  @Throttle({ default: { ttl: 3600, limit: 60 } })
  createFile(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateWorkspaceFileDto,
  ) {
    return this.filesService.createFile(workspaceId, roomId, user.userId, dto);
  }

  @Delete(":roomId/files/:fileId")
  deleteFile(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @Param("fileId", new ParseUUIDPipe({ version: "4" })) fileId: string,
  ) {
    return this.filesService.deleteFile(workspaceId, roomId, fileId);
  }
}
