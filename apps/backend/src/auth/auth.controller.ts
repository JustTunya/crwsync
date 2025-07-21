import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Get, Query } from "@nestjs/common"
import { UserService } from "../user/user.service.js";
import { AuthService } from "./auth.service.js";
import { SigninDto } from "./signin.dto.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(@Body() dto: SigninDto) {
    const user = await this.authService.validateUser(dto);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.signin(user);
  }

  @Get('check-availability')
  @HttpCode(HttpStatus.OK)
  checkAvailability(
    @Query('field') field: 'email' | 'username',
    @Query('value') value: string
  ): Promise<{ available: boolean }> {
    return this.userService.checkEmailOrUsername(field, value);
  }
}