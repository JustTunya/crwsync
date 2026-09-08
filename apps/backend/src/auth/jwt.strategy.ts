import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { JwtPayload } from "@crwsync/types"
import { SessionService } from "src/session/session.service";
import { UserService } from "src/user/user.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.["crw-at"] || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_TOKEN_SECRET")!,
    });
  }

  async validate(payload: JwtPayload) {
    const sessionId = payload.jti;
    if (!sessionId) {
      throw new UnauthorizedException("Missing session id");
    }

    const session = await this.sessionService.findOne(sessionId);
    if (session.revoked_at || (session.expires_at && session.expires_at < new Date())) {
      throw new UnauthorizedException("Session invalid or expired");
    }

    const user = await this.userService.findOne(payload.sub);
    if (user.role_version !== payload.rver) {
      throw new UnauthorizedException("Role has changed, please sign in again");
    }

    return { userId: payload.sub, sessionId, email: payload.email, role: payload.role, roleVersion: payload.rver };
  }
}