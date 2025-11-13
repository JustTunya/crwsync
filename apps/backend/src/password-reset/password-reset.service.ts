import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes, createHash } from "crypto";
import { hash } from "bcrypt"; 
import { PasswordResetEntity } from "src/password-reset/password-reset.entity";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";
import { UpdatePasswordResetDto } from "src/password-reset/dto/update-password-reset.dto";
import { UserEntity } from "src/user/user.entity";
import { EmailService } from "src/email/email.service";
import { SessionService } from "src/session/session.service";
import { PasswordResetStatus } from "@crwsync/types";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetEntity)
    private readonly prRepo: Repository<PasswordResetEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService
  ) {}

  async create(dto: CreatePasswordResetDto): Promise<PasswordResetEntity> {
    const user = await this.uRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const exp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const passwordReset = await this.prRepo.manager.transaction(async (m) => {
      await m.delete(PasswordResetEntity, { email: dto.email, status: "pending" });
      const entity = m.create(PasswordResetEntity, {
        user,
        email: dto.email,
        token_hash: hashedToken,
        expires_at: exp,
      });
      return m.save(entity);
    });

    const appUrl = this.config.get<string>("APP_URL");
    const url = new URL("/auth/reset-password", appUrl);
    url.searchParams.set("token", token);

    await this.emailService.sendEmail({
      to: dto.email,
      subject: "Reset your password",
      template: "reset-password",
      context: { url: url.toString() }
    });

    return this.prRepo.save(passwordReset);
  }

  findAll(): Promise<PasswordResetEntity[]> {
    return this.prRepo.find();
  }

  async findOne(id: string): Promise<PasswordResetEntity> {
    const passwordReset = await this.prRepo.findOne({ where: { id } });
    if (!passwordReset) {
      throw new NotFoundException(`Password reset with ID ${id} not found`);
    }
    return passwordReset;
  }

  async findByEmail(email: string): Promise<PasswordResetEntity> {
    const passwordReset = await this.prRepo.findOne({ where: { email } });
    if (!passwordReset) {
      throw new NotFoundException(`Password reset for email ${email} not found`);
    }
    return passwordReset;
  }

  async findByToken(token: string): Promise<PasswordResetEntity> {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const passwordReset = await this.prRepo.findOne({ where: { token_hash: hashedToken } });
    if (!passwordReset) {
      throw new NotFoundException(`Password reset for token ${token} not found`);
    }
    return passwordReset;
  }

  async update(id: string, dto: UpdatePasswordResetDto): Promise<PasswordResetEntity> {
    const passwordReset = await this.findOne(id);
    if (!passwordReset) {
      throw new NotFoundException(`Password reset with ID ${id} not found`);
    }
    Object.assign(passwordReset, dto);
    return this.prRepo.save(passwordReset);
  }

  async remove(id: string): Promise<void> {
    const result = await this.prRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Password reset with ID ${id} not found`);
    }
  }

  async reset(dto: ResetPasswordDto): Promise<void> {
    const passwordReset = await this.findByToken(dto.token);
    if (!passwordReset) {
      throw new NotFoundException(`Password reset for token ${dto.token} not found`);
    }

    if (passwordReset.status !== "pending") {
      throw new NotFoundException(`Password reset for token ${dto.token} is not pending`);
    }
    if (passwordReset.expires_at < new Date()) {
      throw new NotFoundException(`Password reset for token ${dto.token} has expired`);
    }

    const user = await this.uRepo.findOne({ where: { id: passwordReset.user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${passwordReset.user_id} not found`);
    }

    const hashedPassword = await hash(dto.newPassword, 10);
    user.password_hash = hashedPassword;
    await this.uRepo.save(user);

    passwordReset.status = "used";
    passwordReset.reset_at = new Date();
    await this.prRepo.save(passwordReset);

    await this.sessionService.revokeAll(user.id);
  }

  async getTokenStatus(token: string): Promise<{ status: PasswordResetStatus }> {
    const passwordReset = await this.findByToken(token);

    if (!passwordReset) {
      throw new NotFoundException(`Password reset for token ${token} not found`);
    }

    if (passwordReset.expires_at < new Date()) {
      await this.update(passwordReset.id, { status: PasswordResetStatus.EXPIRED });
      return { status: PasswordResetStatus.EXPIRED };
    }

    return { status: passwordReset.status as PasswordResetStatus };
  }
}