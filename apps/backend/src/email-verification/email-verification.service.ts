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

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly vRepo: Repository<VerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>,
    private readonly emailService: EmailService
  ) {}

  async create(dto: CreateVerificationDto): Promise<VerificationEntity> {
    const user = await this.uRepo.findOne({ where: { id: dto.user_id, email: dto.email } });
    if (!user) {
      throw new NotFoundException(`User with id ${dto.user_id} and email ${dto.email} not found`);
    }
    if (user.email_verified_at) {
      throw new BadRequestException(`User with email ${dto.email} has already verified their email`);
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

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

    await this.emailService.sendEmail({
      to: dto.email,
      subject: "Welcome to CRWSYNC",
      template: "email-verification",
      context: {
        url: `https://crwsync.com/auth/verify-email?token=${token}`
      },
    });

    return this.vRepo.save(verification);
  }

  findAll(): Promise<VerificationEntity[]> {
    return this.vRepo.find();
  }

  async findOne(id: string): Promise<VerificationEntity> {
    const verification = await this.vRepo.findOne({ where: { id } });
    if (!verification) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }
    return verification;
  }

  async findByEmail(email: string): Promise<VerificationEntity> {
    const verification = await this.vRepo.findOne({ where: { email } });
    if (!verification) {
      throw new NotFoundException(`Verification for email ${email} not found`);
    }
    return verification;
  }

  async findByToken(token: string): Promise<VerificationEntity> {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const verification = await this.vRepo.findOne({ where: { token_hash: hashedToken } });
    if (!verification) {
      throw new NotFoundException(`Verification for token ${token} not found`);
    }
    return verification;
  }

  async update(id: string, dto: UpdateVerificationDto): Promise<VerificationEntity> {
    const verification = await this.findOne(id);
    if (!verification) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }
    Object.assign(verification, dto);
    return this.vRepo.save(verification);
  }

  async remove(id: string): Promise<void> {
    const result = await this.vRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }
  }

  async verifyEmail(token: string): Promise<VerificationEntity> {
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
    return this.vRepo.save(verification);
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