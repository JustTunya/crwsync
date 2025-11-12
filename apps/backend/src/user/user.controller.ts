import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, UsePipes, ValidationPipe, Patch, Delete, Query, ParseUUIDPipe, UseGuards} from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/user.entity";
import { Roles } from "src/common/decorators/roles.decorator";
import { OwnershipGuard } from "src/common/guards/ownership.guard";

@Controller("users")
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(RoleEnum.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.userService.create(dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<UserEntity[]> {
    return this.userService.findAll();
  }

  @Get("check-availability")
  @HttpCode(HttpStatus.OK)
  checkAvailability(
    @Query("field") field: "email" | "username",
    @Query("value") value: string
  ): Promise<{ available: boolean }> {
    return this.userService.checkEmailOrUsername(field, value);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Get(":userId")
  @HttpCode(HttpStatus.OK)
  findOne(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<UserEntity> {
    return this.userService.findOne(userId);
  }

  @UseGuards(new OwnershipGuard("userId"))
  @Patch(":userId")
  @HttpCode(HttpStatus.OK)
  update(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string, @Body() dto: UpdateUserDto): Promise<UserEntity> {
    return this.userService.update(userId, dto);
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<void> {
    await this.userService.remove(userId);
  }
}