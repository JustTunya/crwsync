import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Req } from "@nestjs/common"
import { Request } from "express";
import { AuthService } from "src/auth/auth.service";
import { SignupDto } from "src/auth/dto/signup.dto";
import { SigninDto } from "src/auth/dto/signin.dto";
import { SignoutDto } from "src/auth/dto/signout.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(@Body() dto: SigninDto, @Req() req: Request) {
    const user = await this.authService.validateUser(dto);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.signin(user, req);
  }

  @Post("signout")
  @HttpCode(HttpStatus.OK)
  async signout(@Body() dto: SignoutDto) {
    return this.authService.signout(dto);
  }
}