import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { PasswordResetEntity } from "src/password-reset/password-reset.entity";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";
import { UpdatePasswordResetDto } from "src/password-reset/dto/update-password-reset.dto";
import { UserEntity } from "src/user/user.entity";
import { EmailService } from "src/email/email.service";

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetEntity)
    private readonly prRepo: Repository<PasswordResetEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>,
    private readonly emailService: EmailService
  ) {}

  async create(dto: CreatePasswordResetDto): Promise<PasswordResetEntity> {
    const user = await this.uRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    const token = randomBytes(32).toString("hex");
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const passwordReset = await this.prRepo.manager.transaction(async (m) => {
      await m.delete(PasswordResetEntity, { email: dto.email, is_reseted: false });
      const entity = m.create(PasswordResetEntity, {
        email: dto.email,
        token,
        user,
        expires_at: exp,
      });
      return m.save(entity);
    });

    await this.emailService.sendEmail({
      to: dto.email,
      subject: "Reset your password",
      template: "reset-password",
      context: {
        url: `https://crwsync.com/auth/reset-password?token=${token}`
      },
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
    const passwordReset = await this.prRepo.findOne({ where: { token } });
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
}