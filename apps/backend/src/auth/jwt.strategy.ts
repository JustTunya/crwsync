import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { SessionService } from "src/session/session.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly sessionService: SessionService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_TOKEN_SECRET")!,
    });
}

async validate(payload: { sub: string; email: string; jti: string }) {
  const sessionId = payload.jti;
  if (!sessionId) {
    throw new UnauthorizedException("Missing session id");
  }

  const session = await this.sessionService.findOne(sessionId);
  if (session.revoked_at || (session.expires_at && session.expires_at < new Date())) {
    throw new UnauthorizedException("Session invalid or expired");
  }
  return { userId: payload.sub, sessionId, email: payload.email };
  }
}