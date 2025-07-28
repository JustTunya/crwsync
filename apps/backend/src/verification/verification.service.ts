import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VerificationEntity } from "./verification.entity";
import { CreateVerificationDto } from "./create-verification.dto";
import { UpdateVerificationDto } from "./update-verification.dto";

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly repo: Repository<VerificationEntity>,
  ) {}

  async create(dto: CreateVerificationDto): Promise<VerificationEntity> {
    const verification = this.repo.create(dto);
    return this.repo.save(verification);
  }

  findAll(): Promise<VerificationEntity[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<VerificationEntity> {
    const verification = await this.repo.findOne({ where: { id } });
    if (!verification) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }
    return verification;
  }

  async findByEmail(email: string): Promise<VerificationEntity> {
    const verification = await this.repo.findOne({ where: { email } });
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
    return this.repo.save(verification);
  }

  async verify(id: string): Promise<VerificationEntity> {
    const verification = await this.findOne(id);
    if (!verification) {
      throw new NotFoundException(`Verification for ID ${id} not found`);
    }

    verification.isVerified = true;
    verification.verifiedAt = new Date();
    return this.repo.save(verification);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }
  }
}