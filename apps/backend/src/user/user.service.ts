import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { hash } from "bcrypt";
import { UserEntity } from "src/user/user.entity";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { VerificationService } from "src/verification/verification.service";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const user = this.repo.create({
      ...dto,
      password_hash: await hash(dto.password, 10)
    });

    return this.repo.save(user);
  }

  findAll(): Promise<UserEntity[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: [
        { email: identifier },
        { username: identifier }
      ]
    });
  }

  async checkEmailOrUsername(field: 'email' | 'username', value: string): Promise<{ available: boolean }> {
    const exists = await this.repo.findOne({
      where: { [field]: value }
    });
    return { available: !exists };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    if (dto.password) {
      user.password_hash = await hash(dto.password, 10);
    }
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}