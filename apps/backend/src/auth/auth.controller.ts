import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Get } from "@nestjs/common"
import { AuthService } from "./auth.service.js";
import { SigninDto } from "./signin.dto.js";
import * as bcrypt from "bcrypt";

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