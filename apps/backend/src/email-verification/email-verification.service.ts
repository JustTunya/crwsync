import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes, createHash } from "crypto";
import { Repository } from "typeorm";
import { VerificationEntity } from "src/email-verification/email-verification.entity";
import { CreateVerificationDto } from "src/email-verification/dto/create-email-verification.dto";
import { UpdateVerificationDto } from "src/email-verification/dto/update-email-verification.dto";
import { UserEntity } from "src/user/user.entity";
import { EmailService } from "src/email/email.service";
import { MailVerificationStatus } from "@crwsync/types";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly vRepo: Repository<VerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService
  ) {}

  async create(dto: CreateVerificationDto): Promise<VerificationEntity> {
    const user = await this.uRepo.findOne({ where: { id: dto.user_id, email: dto.email } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.email_verified_at) {
      throw new BadRequestException("User has already verified their email");
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const verification = await this.vRepo.manager.transaction(async (m) => {
      await m.delete(VerificationEntity, { email: dto.email, status: "pending" });
      const entity = m.create(VerificationEntity, {
        user,
        email: dto.email,
        token_hash: hashedToken,
        expires_at: exp,
      });
      return m.save(entity);
    });

    const appUrl = this.config.get<string>("APP_URL");
    const url = new URL("/auth/verify-email", appUrl);
    url.searchParams.set("token", token);

    await this.emailService.sendEmail({
      to: dto.email,
      subject: "Welcome to CRWSYNC",
      template: "email-verification",
      context: { url: url.toString() }
    });

    return verification;
  }

  findAll(): Promise<VerificationEntity[]> {
    return this.vRepo.find();
  }

  async findOne(id: string): Promise<VerificationEntity> {
    const verification = await this.vRepo.findOne({ where: { id } });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    return verification;
  }

  async findByEmail(email: string): Promise<VerificationEntity> {
    const verification = await this.vRepo.findOne({ where: { email } });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    return verification;
  }

  async findByToken(token: string): Promise<VerificationEntity> {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const verification = await this.vRepo.findOne({ where: { token_hash: hashedToken } });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    return verification;
  }

  async update(id: string, dto: UpdateVerificationDto): Promise<VerificationEntity> {
    const verification = await this.findOne(id);
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    Object.assign(verification, dto);
    return this.vRepo.save(verification);
  }

  async remove(id: string): Promise<void> {
    const result = await this.vRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException("Verification not found");
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const verification = await this.vRepo.findOne({ where: { token_hash: hashedToken }, relations: ["user"] });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }

    if (verification.status !== "pending") {
      throw new NotFoundException("Verification not found");
    }

    if (verification.expires_at && verification.expires_at < new Date()) {
      verification.status = MailVerificationStatus.EXPIRED;
      await this.vRepo.save(verification);

      throw new NotFoundException("Verification not found");
    }

    const user = verification.user;
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.email_verified_at = new Date();
    await this.uRepo.save(user);

    verification.status = MailVerificationStatus.VERIFIED;
    verification.verified_at = new Date();
    await this.vRepo.save(verification);

    return { success: true, message: "Email verified successfully" };
  }

  async getTokenStatus(token: string): Promise<{ status: MailVerificationStatus }> {
    const verification = await this.findByToken(token).catch(() => undefined);
    if (!verification) {
      throw new NotFoundException("Invalid token");
    }

    const status = verification.expires_at && verification.expires_at < new Date() ? MailVerificationStatus.EXPIRED : verification.status as MailVerificationStatus;
    return { status };
  }
}