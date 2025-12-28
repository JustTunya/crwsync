import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { randomBytes, createHash, randomUUID } from "crypto";
import { CreateSessionDto } from "src/session/dto/create-session.dto";
import { UpdateSessionDto } from "src/session/dto/update-session.dto";
import { RotateSessionDto } from "src/session/dto/rotate-session.dto";
import { getClientIp, getUserAgent } from "src/session/session.utils";
import { VerifySessionDto } from "src/session/dto/verify-session.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionPublic, sessionPublicSelect } from "src/prisma/selects";

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSessionDto, req: Request): Promise<{ session: SessionPublic; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.user_id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const exp = dto.persistent
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        id: dto.id,
        user: { connect: { id: dto.user_id } },
        refresh_token_hash: hashedToken,
        persistent: dto.persistent ?? false,
        expires_at: exp,
        ip: getClientIp(req) || null,
        ua: getUserAgent(req) || null,
        created_at: new Date(),
      },
      select: sessionPublicSelect,
    });

    return { session, token };
  }

  findAll(): Promise<SessionPublic[]> {
    return this.prisma.session.findMany({ select: sessionPublicSelect });
  }

  async findOne(id: string): Promise<SessionPublic> {
    const session = await this.prisma.session.findUnique({ where: { id }, select: sessionPublicSelect });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  async update(id: string, dto: UpdateSessionDto): Promise<SessionPublic> {
    const session = await this.prisma.session.findUnique({ where: { id }, select: { id: true } });
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    const data = {
      persistent: dto.persistent,
      ...(dto.user_id ? { user: { connect: { id: dto.user_id } } } : {}),
    };

    return this.prisma.session.update({ where: { id }, data, select: sessionPublicSelect });
  }

  async remove(id: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id }, select: { id: true } });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    await this.prisma.session.delete({ where: { id } });
  }

  async verify(dto: VerifySessionDto): Promise<SessionPublic> {
    const hashedToken = createHash("sha256").update(dto.token).digest("hex");
    const session = await this.prisma.session.findFirst({
      where: { refresh_token_hash: hashedToken },
      select: sessionPublicSelect,
    });
    if (!session) {
      throw new UnauthorizedException("Invalid session token");
    }
    if (session.expires_at && session.expires_at < new Date()) {
      throw new UnauthorizedException("Session has expired");
    }
    if (session.revoked_at) {
      throw new UnauthorizedException("Session has been revoked");
    }
    return session;
  }

  async rotate(dto: RotateSessionDto, req: Request): Promise<{ session: SessionPublic; refreshToken: string }> {
    const oldHashedToken = createHash("sha256").update(dto.old_token).digest("hex");
    const oldSession = await this.prisma.session.findFirst({
      where: { user_id: dto.user_id, refresh_token_hash: oldHashedToken },
      select: { id: true, expires_at: true, revoked_at: true },
    });
    if (!oldSession) {
      throw new NotFoundException("Old session not found");
    }
    if (oldSession.expires_at && oldSession.expires_at < new Date()) {
      throw new BadRequestException("Old session has expired");
    }
    if (oldSession.revoked_at) {
      throw new BadRequestException("Old session has been revoked");
    }

    const { session: newSession, token: refreshToken } = await this.create(
      { id: randomUUID(), user_id: dto.user_id, persistent: dto.persistent },
      req,
    );

    await this.revoke(oldSession.id);

    return { session: newSession, refreshToken };
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { id }, data: { revoked_at: new Date() } });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async purgeExpired(): Promise<void> {
    await this.prisma.session.deleteMany({ where: { expires_at: { lt: new Date() } } });
  }

  async purgeRevoked(cutoff: Date): Promise<void> {
    await this.prisma.session.deleteMany({ where: { revoked_at: { lt: cutoff } } });
  }

  async purgeAll(): Promise<void> {
    await this.prisma.session.deleteMany({});
  }
}