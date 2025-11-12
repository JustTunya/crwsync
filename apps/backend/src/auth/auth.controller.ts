import { Controller, Post, Get, Body, HttpCode, HttpStatus, UnauthorizedException, Req, Res, UseGuards } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "src/auth/auth.service";
import { SignupDto } from "src/auth/dto/signup.dto";
import { SigninDto } from "src/auth/dto/signin.dto";
import { ConfigService } from "@nestjs/config";
import { Public } from "src/common/decorators/public.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import { ActiveUser } from "src/common/types/active-user.type";

// --- COOKIE SETTINGS ---
const isProduction = process.env.NODE_ENV === "production";
const accessCookieDomain = isProduction ? process.env.ACCESS_COOKIE_DOMAIN : undefined;
const refreshCookieDomain = isProduction ? process.env.REFRESH_COOKIE_DOMAIN : undefined;
const accessMaxAge = 15 * 60 * 1000; // 15 minutes
const refreshMaxAge = (persistent: boolean | undefined) => persistent
  ? 30 * 24 * 60 * 60 * 1000 // 30 days
  : 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Public()
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

    res.cookie("crw-at", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: accessMaxAge,
      domain: accessCookieDomain,
    });

    res.cookie("crw-rt", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: refreshMaxAge(dto.rememberMe),
      domain: refreshCookieDomain,
    });

    return { message: "Signin successful" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("signout")
  @HttpCode(HttpStatus.OK)
  async signout(@Req() req: Request, @Res() res: Response) {
    return this.authService.signout(req, res);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

    res.clearCookie("crw-at", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      domain: accessCookieDomain,
    });
    res.clearCookie("crw-rt", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      domain: refreshCookieDomain,
    });

    res.cookie("crw-at", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: accessMaxAge,
      domain: accessCookieDomain,
    });

    res.cookie("crw-rt", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: refreshMaxAge,
      domain: refreshCookieDomain,
    });

    return { message: "Tokens refreshed" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@ActiveUserParam() user: ActiveUser) {
    return this.authService.me({ userId: user.userId });
  }
}