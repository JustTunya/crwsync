import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtResponse } from "@crwsync/types";
import { compare } from "bcrypt";
import { Request } from "express";
import { randomUUID } from "crypto";
import { VerificationService } from "src/email-verification/email-verification.service";
import { SessionService } from "src/session/session.service";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/user.entity";
import { SigninDto } from "src/auth/dto/signin.dto";
import { SignupDto } from "./dto/signup.dto";
import { SignoutDto } from "./dto/signout.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(dto: SigninDto): Promise<UserEntity | null> {
    const user = await this.userService.findByEmailOrUsername(dto.identifier);
    if (user && await compare(dto.password, user.password_hash)) {
      return user;
    }
    return null;
  }

  async signup(dto: SignupDto): Promise<UserEntity> {
    const existingUser = await this.userService.findByEmailOrUsername(dto.email);

    if (existingUser) {
      throw new BadRequestException(`User with email ${dto.email} already exists`);
    }

    const user = await this.userService.create(dto);

    await this.verificationService.create({ user_id: user.id, email: dto.email });

    return user;
  }

  async signin(user: UserEntity, req: Request): Promise<JwtResponse> {
    const jti = randomUUID();
    const payload = { jti, sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET!,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION!,
    });
    const { token: refreshToken } = await this.sessionService.create({ id: jti, user_id: user.id }, req);

    await this.userService.update(user.id, { last_login: new Date().toISOString() });

    return { accessToken, refreshToken };
  }

  async signout(dto: SignoutDto): Promise<void> {
    const session = await this.sessionService.findOne(dto.sessionId);

    if (!session) {
      throw new NotFoundException(`Session with id ${dto.sessionId} not found`);
    }
    if (session.user_id !== dto.userId) {
      throw new BadRequestException(`Session with id ${dto.sessionId} does not belong to user with id ${dto.userId}`);
    }

    await this.sessionService.revoke(dto.sessionId);
  }
}