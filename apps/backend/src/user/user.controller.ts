import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, UsePipes, ValidationPipe, Patch, Delete, Query, ParseUUIDPipe, UseGuards} from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { UserService } from "src/user/user.service";
import { Roles } from "src/common/decorators/roles.decorator";
import { OwnershipGuard } from "src/common/guards/ownership.guard";
import { Public } from "src/common/decorators/public.decorator";
import { UserPublic } from "src/prisma/selects";

@Controller("users")
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  searchByIdentifier(@Query("identifier") identifier: string): Promise<UserPublic[]> {
    return this.userService.searchByEmailOrUsername(identifier);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Get(":userId")
  @HttpCode(HttpStatus.OK)
  findOne(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<UserPublic> {
    return this.userService.findOne(userId);
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
}