import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Get, Query } from "@nestjs/common"
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { SigninDto } from "./signin.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(@Body() dto: SigninDto) {
    const user = await this.authService.validateUser(dto);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.signin(user);
  }
}