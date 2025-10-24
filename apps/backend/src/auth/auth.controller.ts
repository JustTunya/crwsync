import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Req } from "@nestjs/common"
import { Request } from "express";
import { AuthService } from "src/auth/auth.service";
import { SigninDto } from "src/auth/dto/signin.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(@Body() dto: SigninDto, @Req() req: Request) {
    const user = await this.authService.validateUser(dto);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.signin(user, req);
  }
}