import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, Patch, Delete, Query, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ActiveSession, RoleEnum, PresignedAvatarUpload } from "@crwsync/types";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { ChangePasswordDto } from "src/user/dto/change-password.dto";
import { UserService } from "src/user/user.service";
import { SessionService } from "src/session/session.service";
import { Roles } from "src/common/decorators/roles.decorator";
import { OwnershipGuard } from "src/common/guards/ownership.guard";
import { Public } from "src/common/decorators/public.decorator";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { UserPublic } from "src/prisma/selects";
import { PresignAvatarDto } from "src/storage/dto/presign-avatar.dto";
import { StorageService } from "src/storage/storage.service";

@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly storageService: StorageService,
  ) {}

  @Roles(RoleEnum.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<UserPublic> {
    return this.userService.create(dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<UserPublic[]> {
    return this.userService.findAll();
  }

  @Public()
  @Get("check-availability")
  @HttpCode(HttpStatus.OK)
  checkAvailability(
    @Query("field") field: "email" | "username",
    @Query("value") value: string
  ): Promise<{ available: boolean }> {
    return this.userService.checkEmailOrUsername(field, value);
  }

  @Public()
  @Get("search")
  @HttpCode(HttpStatus.OK)
  searchByIdentifier(
    @Query("identifier") identifier: string,
    @Query("workspaceId") workspaceId?: string,
  ): Promise<UserPublic[]> {
    return this.userService.searchByEmailOrUsername(identifier, workspaceId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Get(":userId")
  @HttpCode(HttpStatus.OK)
  findOne(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<UserPublic> {
    return this.userService.findOne(userId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  @Post(":userId/avatar/presign")
  @HttpCode(HttpStatus.OK)
  presignAvatar(
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Body() dto: PresignAvatarDto,
  ): Promise<PresignedAvatarUpload> {
    return this.storageService.presignAvatarUpload(dto.contentType, userId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Patch(":userId")
  @HttpCode(HttpStatus.OK)
  update(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string, @Body() dto: UpdateUserDto): Promise<UserPublic> {
    return this.userService.update(userId, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<void> {
    await this.userService.remove(userId);
  }
  
  @UseGuards(new OwnershipGuard("userId"))
  @Get(":userId/invites")
  @HttpCode(HttpStatus.OK)
  findInvites(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string) {
    return this.userService.findInvites(userId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  @Post(":userId/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Body() dto: ChangePasswordDto,
    @ActiveUserParam() activeUser: ActiveUser,
  ): Promise<void> {
    await this.userService.changePassword(userId, dto, activeUser.sessionId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Get(":userId/sessions")
  @HttpCode(HttpStatus.OK)
  async findSessions(
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @ActiveUserParam() activeUser: ActiveUser,
  ): Promise<ActiveSession[]> {
    const sessions = await this.sessionService.findAllByUser(userId);
    return sessions.map((session) => ({
      ...session,
      expires_at: session.expires_at?.toISOString() ?? null,
      created_at: session.created_at.toISOString(),
      revoked_at: session.revoked_at?.toISOString() ?? null,
      isCurrent: session.id === activeUser.sessionId,
    }));
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Delete(":userId/sessions/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Param("sessionId", new ParseUUIDPipe({ version: "4" })) sessionId: string,
  ): Promise<void> {
    await this.sessionService.revokeOwned(userId, sessionId);
  }
}