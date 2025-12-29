import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcrypt";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { UpdateUserDto } from "src/user/dto/update-user.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { UserAuth, userAuthSelect, UserPublic, userPublicSelect } from "src/prisma/selects";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserPublic> {
    const data = {
      email: dto.email,
      username: dto.username,
      firstname: dto.firstname,
      lastname: dto.lastname,
      birthdate: new Date(`${dto.birthdate}T00:00:00.000Z`),
      password_hash: await hash(dto.password, 10),
    } as Prisma.UserCreateInput;

    return this.prisma.user.create({ data, select: userPublicSelect });
  }

  findAll(): Promise<UserPublic[]> {
    return this.prisma.user.findMany({ select: userPublicSelect });
  }

  async findOne(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userPublicSelect });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserAuth | null> {
    return this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      select: userAuthSelect,
    });
  }

  async checkEmailOrUsername(field: "email" | "username", value: string): Promise<{ available: boolean }> {
    const where = field === "email" ? { email: value } : { username: value };
    const exists = await this.prisma.user.findUnique({ where, select: { id: true } });
    return { available: !exists };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    const user = await this.findOne(id);

    const data: Prisma.UserUpdateInput = { ...dto };

    if (dto.password) {
      data.password_hash = await hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data,
      select: userPublicSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.prisma.user.delete({ where: { id: user.id } });
  }
}