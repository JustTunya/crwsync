import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VerificationEntity } from "./verification.entity";
import { CreateVerificationDto } from "./dto/create-verification.dto";
import { UpdateVerificationDto } from "./dto/update-verification.dto";
import { UserEntity } from "src/user/user.entity";
import { randomBytes } from "crypto";

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly vRepo: Repository<VerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly uRepo: Repository<UserEntity>
  ) {}

  async create(dto: CreateVerificationDto): Promise<VerificationEntity> {
    const existing = await this.vRepo.findOne({ where: { email: dto.email } });
    if (existing && existing.is_verified) {
      throw new BadRequestException(`This email address is already verified`);
    }

    const user = await this.uRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    const token = randomBytes(32).toString('hex');

    const exp = new Date();
    exp.setDate(exp.getDate() + Number(process.env.VERIFICATION_EXPIRATION_DAYS));

    const verification = this.vRepo.create({
      email: dto.email,
      token,
      user,
      expires_at: exp,
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