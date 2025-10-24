import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtResponse } from "@crwsync/types";
import { compare } from "bcrypt";
import { Request } from "express";
import { SessionService } from "src/session/session.service";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/user.entity";
import { SigninDto } from "src/auth/dto/signin.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
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

  async signin(user: UserEntity, req: Request): Promise<JwtResponse> {
    const payload = { id: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

    await this.userService.update(user.id, { last_login: new Date().toISOString() });

    await this.sessionService.create({ user_id: user.id }, req);

    return { accessToken, refreshToken };
  }
}