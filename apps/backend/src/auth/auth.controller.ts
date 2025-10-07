import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Param } from "@nestjs/common"
import { AuthService } from "src/auth/auth.service";
import { SigninDto } from "src/auth/dto/signin.dto";

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