import { Controller, Post, Get, Body, HttpCode, HttpStatus, UnauthorizedException, Req, Res, UseGuards } from "@nestjs/common"
import { SkipThrottle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "src/auth/auth.service";
import { SignupDto } from "src/auth/dto/signup.dto";
import { SigninDto } from "src/auth/dto/signin.dto";
import { ConfigService } from "@nestjs/config";
import { Public } from "src/common/decorators/public.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import { ActiveUser } from "src/common/types/active-user.type";
import { setAuthCookies } from "./auth.cookie";

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

    setAuthCookies(res, accessToken, refreshToken, dto.rememberMe);

    return { message: "Signin successful" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("signout")
  @HttpCode(HttpStatus.OK)
  async signout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.signout(req, res);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { accessToken, refreshToken, persistent } = await this.authService.refresh(req);

    setAuthCookies(res, accessToken, refreshToken, persistent);

    return { message: "Tokens refreshed" };
  }

  @Public()
  @SkipThrottle()
  @Post("session")
  async session(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, refresh } = await this.authService.sessionBootstrap(req);

    if (refresh) {
      setAuthCookies(res, refresh.accessToken, refresh.refreshToken, refresh.persistent);
    }

    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@ActiveUserParam() user: ActiveUser) {
    return this.authService.me({ userId: user.userId });
  }
}