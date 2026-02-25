import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { ChatService } from "src/chat/chat.service";
import { CreateChatRoomDto } from "src/chat/dto/chat.dto";

@Controller("workspaces/:workspaceId/chat")
@UseGuards(IsMemberGuard)
@SkipThrottle()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  create(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" }))
    workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createRoom(workspaceId, user.userId, dto);
  }

  @Get(":roomId")
  findOne(
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
  ) {
    return this.chatService.getRoom(roomId);
  }

  @Get(":roomId/messages")
  getMessages(
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.chatService.getMessages(roomId, cursor, limit);
  }
}
