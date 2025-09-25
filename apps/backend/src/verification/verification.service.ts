import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VerificationEntity } from "./verification.entity";
import { CreateVerificationDto } from "./dto/create-verification.dto";
import { UpdateVerificationDto } from "./dto/update-verification.dto";
import { UserEntity } from "src/user/user.entity";
import { randomBytes } from "crypto";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly vRepo: Repository<VerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>,
    private readonly mailService: MailService
  ) {}

  async create(dto: CreateVerificationDto): Promise<VerificationEntity> {
    const user = await this.uRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }
    if (user.email_verified) {
      throw new BadRequestException(`User with ID ${dto.user_id} has already verified their email`);
    }

    const token = randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const verification = await this.vRepo.manager.transaction(async (m) => {
      await m.delete(VerificationEntity, { email: dto.email, is_verified: false });
      const entity = m.create(VerificationEntity, {
        email: dto.email,
        token,
        user,
        expires_at: exp,
        is_verified: false,
      });
      return m.save(entity);
    });

    await this.mailService.sendMail({
      to: dto.email,
      subject: 'Welcome to CRWSYNC',
      template: 'email-verification',
      context: {
        url: `https://crwsync.com/verify-email/${token}`
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

  async verify(token: string): Promise<VerificationEntity> {
    const verification = await this.vRepo.findOne({ where: { token }, relations: ['user'] });
    if (!verification) {
      throw new NotFoundException(`Verification with token ${token} not found`);
    }

    const user = verification.user;
    if (!user) {
      throw new NotFoundException(`User associated with this verification not found`);
    }

    user.email_verified = true;
    await this.uRepo.save(user);

    verification.is_verified = true;
    verification.verified_at = new Date();
    return this.vRepo.save(verification);
  }
}