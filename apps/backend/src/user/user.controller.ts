import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, UsePipes, ValidationPipe, Patch, Delete, Query } from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UserEntity } from "./user.entity";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    console.log('Creating user with data:', dto);
    return this.userService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(): Promise<UserEntity[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.userService.findOne(id);
  }

  @Get('check-availability')
  @HttpCode(HttpStatus.OK)
  checkAvailability(
    @Query('field') field: 'email' | 'username',
    @Query('value') value: string
  ): Promise<{ available: boolean }> {
    return this.userService.checkEmailOrUsername(field, value);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserEntity> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.userService.remove(id);
  }
}