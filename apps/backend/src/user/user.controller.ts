import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, UsePipes, ValidationPipe, Patch, Delete, Query, ParseUUIDPipe} from "@nestjs/common";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/user.entity";

@Controller("users")
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.userService.create(dto);
  }

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

  @Get(":userId")
  @HttpCode(HttpStatus.OK)
  findOne(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<UserEntity> {
    return this.userService.findOne(userId);
  }

  @Patch(":userId")
  @HttpCode(HttpStatus.OK)
  update(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string, @Body() dto: UpdateUserDto): Promise<UserEntity> {
    return this.userService.update(userId, dto);
  }

  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string): Promise<void> {
    await this.userService.remove(userId);
  }
}