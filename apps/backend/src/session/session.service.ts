import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "express";
import { randomBytes, createHash, randomUUID } from "crypto";
import { SessionEntity } from "src/session/session.entity";
import { CreateSessionDto } from "src/session/dto/create-session.dto";
import { UpdateSessionDto } from "src/session/dto/update-session.dto";
import { RotateSessionDto } from "src/session/dto/rotate-session.dto";
import { getClientIp, getUserAgent } from "src/session/session.utils";
import { UserEntity } from "src/user/user.entity";

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sRepo: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>,
  ) {}

  async create(dto: CreateSessionDto, req: Request): Promise<{session: SessionEntity, token: string}> {
    const user = await this.uRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      throw new NotFoundException(`User with id ${dto.user_id} not found`);
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await this.sRepo.manager.transaction(async (m) => {
      const entity = m.create(SessionEntity, {
        id: dto.id,
        user_id: dto.user_id,
        refresh_token_hash: hashedToken,
        expires_at: exp,
        ip: getClientIp(req) || undefined,
        ua: getUserAgent(req) || undefined,
        created_at: new Date(),
      });
      return m.save(entity);
    });

    return { session, token };
  }

  findAll(): Promise<SessionEntity[]> {
    return this.sRepo.find();
  }

  async findOne(id: string): Promise<SessionEntity> {
    const session = await this.sRepo.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }
    return session;
  }

  async update(id: string, dto: UpdateSessionDto): Promise<SessionEntity> {
    const session = await this.sRepo.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }

    Object.assign(session, dto);
    return this.sRepo.save(session);
  }

  async remove(id: string): Promise<void> {
    const result = await this.sRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }
  }

  async verify(userId: string, token: string): Promise<SessionEntity> {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const session = await this.sRepo.findOne({ where: { user_id: userId, refresh_token_hash: hashedToken } });
    if (!session) {
      throw new NotFoundException(`Session with userId ${userId} and token ${token} not found`);
    }
    if (session.expires_at && session.expires_at < new Date()) {
      throw new BadRequestException(`Session with userId ${userId} and token ${token} has expired`);
    }
    if (session.revoked_at) {
      throw new BadRequestException(`Session with userId ${userId} and token ${token} has been revoked`);
    }
    return session;
  }

  async rotate(dto: RotateSessionDto, req: Request): Promise<SessionEntity> {
    const oldHashedToken = createHash('sha256').update(dto.old_token).digest('hex');
    const oldSession = await this.sRepo.findOne({ where: { user_id: dto.user_id, refresh_token_hash: oldHashedToken } });
    if (!oldSession) {
      throw new NotFoundException(`Old session with userId ${dto.user_id} and token ${dto.old_token} not found`);
    }
    if (oldSession.expires_at && oldSession.expires_at < new Date()) {
      throw new BadRequestException(`Old session with userId ${dto.user_id} and token ${dto.old_token} has expired`);
    }
    if (oldSession.revoked_at) {
      throw new BadRequestException(`Old session with userId ${dto.user_id} and token ${dto.old_token} has been revoked`);
    }

    const { session: newSession } = await this.create({
      id: randomUUID(),
      user_id: dto.user_id
    }, req);

    oldSession.revoked_at = new Date();
    await this.sRepo.save(oldSession);

    return newSession;
  }

  async revoke(id: string): Promise<void> {
    await this.sRepo.update(id, { revoked_at: new Date() });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.sRepo.createQueryBuilder()
      .update(SessionEntity)
      .set({ revoked_at: new Date() })
      .where("user_id = :userId", { userId })
      .andWhere("revoked_at IS NULL")
      .execute();
  }

  async purgeExpired(): Promise<void> {
    await this.sRepo.createQueryBuilder()
      .delete()
      .from(SessionEntity)
      .where("expires_at IS NOT NULL AND expires_at < NOW()")
      .execute();
  }
}