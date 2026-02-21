import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcrypt";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import type { JwtPayload, JwtResponse } from "@crwsync/types";
import { VerificationService } from "src/email-verification/email-verification.service";
import { SessionService } from "src/session/session.service";
import { UserService } from "src/user/user.service";
import { SigninDto } from "src/auth/dto/signin.dto";
import { SignupDto } from "src/auth/dto/signup.dto";
import { SessionUserDto } from "src/auth/dto/session-user.dto";
import { RefreshDto } from "src/auth/dto/refresh.dto";
import { UserPublic } from "src/prisma/selects";

// --- COOKIE SETTINGS ---
const isProduction = process.env.NODE_ENV === "production";
const accessCookieDomain = isProduction ? process.env.ACCESS_COOKIE_DOMAIN : undefined;
const refreshCookieDomain = isProduction ? process.env.REFRESH_COOKIE_DOMAIN : undefined;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  private payload(user: UserPublic, jti: string) {
    return { jti, sub: user.id, email: user.email, role: user.role, rver: user.role_version, status_preference: user.status_preference };
  }

  async validateUser(dto: SigninDto): Promise<UserPublic | null> {
    const user = await this.userService.findByEmailOrUsername(dto.identifier);
    if (user && (await compare(dto.password, user.password_hash))) {
      return await this.userService.findOne(user.id);
    }
    return null;
  }

  async signup(dto: SignupDto): Promise<UserPublic> {
    const existingUser = await this.userService.findByEmailOrUsername(dto.email);

    if (existingUser) {
      throw new BadRequestException(`User with email ${dto.email} already exists`);
    }

    const user = await this.userService.create(dto);

    await this.verificationService.create({ user_id: user.id, email: dto.email });

    return user;
  }

  async signin(user: UserPublic, req: Request, rememberMe?: boolean): Promise<JwtResponse> {
    const verification = await this.verificationService.findByEmail(user.email);

    if (verification && verification.status !== "verified") {
      throw new BadRequestException(`Email ${user.email} is not verified`);
    }

    const jti = randomUUID();
    const accessToken = this.jwtService.sign(this.payload(user, jti));

    const { token: refreshToken } = await this.sessionService.create(
      { id: jti, user_id: user.id, persistent: !!rememberMe },
      req,
    );

    await this.userService.update(user.id, { last_login: new Date().toISOString() });

    return { accessToken, refreshToken };
  }

  async signout(req: Request, res: Response): Promise<void> {
    const accessToken = req.cookies["crw-at"];
    const refreshToken = req.cookies["crw-rt"];

    try {
      if (refreshToken) {
        const session = await this.sessionService.verify({ token: refreshToken });
        await this.sessionService.revoke(session.id);
      } else if (accessToken) {
        const payload = this.jwtService.verify<{ jti: string; sub: string; email: string }>(accessToken);
        await this.sessionService.revoke(payload.jti);
      }
    } finally {
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
    }
  }

  async refresh(req: Request): Promise<RefreshDto> {
    const oldRefreshToken = req.cookies["crw-rt"];

    if (!oldRefreshToken) {
      throw new BadRequestException("Refresh token not found");
    }

    const session = await this.sessionService.verify({ token: oldRefreshToken });

    if (!session) {
      throw new BadRequestException("Invalid refresh token");
    }

    const { session: newSession, refreshToken } = await this.sessionService.rotate(
      {
        user_id: session.user_id,
        old_token: oldRefreshToken,
        persistent: session.persistent,
      },
      req,
    );

    const user = await this.userService.findOne(session.user_id);

    const accessToken = this.jwtService.sign(this.payload(user, newSession.id));

    return { accessToken, refreshToken, persistent: newSession.persistent };
  }

  async sessionBootstrap(req: Request): Promise<{ user: SessionUserDto; refresh?: RefreshDto }> {
    const accessToken = req.cookies?.["crw-at"] as string | undefined;

    if (accessToken) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(accessToken);
        const user = await this.me({ userId: payload.sub });
        return { user };
      } catch {
        // If access token is invalid/expired, we'll attempt to refresh below
      }
    }

    try {
      const refresh = await this.refresh(req);
      const payload = this.jwtService.verify<JwtPayload>(refresh.accessToken);
      const user = await this.me({ userId: payload.sub });

      return { user, refresh };
    } catch {
      throw new UnauthorizedException();
    }
  }

  async me(active: { userId: string }) {
    const user = (await this.userService.findOne(active.userId)) as SessionUserDto;

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}