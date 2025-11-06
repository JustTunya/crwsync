import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Req, Res } from "@nestjs/common"
import { Request, Response } from "express";
import { AuthService } from "src/auth/auth.service";
import { SignupDto } from "src/auth/dto/signup.dto";
import { SigninDto } from "src/auth/dto/signin.dto";
import { SignoutDto } from "src/auth/dto/signout.dto";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(
    @Body() dto: SigninDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const user = await this.authService.validateUser(dto);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { accessToken, refreshToken } = await this.authService.signin(user, req, dto.rememberMe);

    const accessMaxAge = 15 * 60 * 1000; // 15 minutes
    const refreshMaxAge = dto.rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      maxAge: accessMaxAge,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      maxAge: refreshMaxAge,
    });

    return { message: "Signin successful" };
  }

  @Post("signout")
  @HttpCode(HttpStatus.OK)
  async signout(@Body() dto: SignoutDto, @Res() res: Response) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    
    return this.authService.signout(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { accessToken, refreshToken, persistent } = await this.authService.refresh(req);

    const accessMaxAge = 15 * 60 * 1000; // 15 minutes
    const refreshMaxAge = persistent
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      maxAge: accessMaxAge,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      maxAge: refreshMaxAge,
    });

    return { message: "Tokens refreshed" };
  }
}