import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtResponse } from "@crwsync/types";
import { UserService } from "../user/user.service";
import { UserEntity } from "../user/user.entity";
import { SigninDto } from "./signin.dto";
import { compare } from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(dto: SigninDto): Promise<UserEntity | null> {
    const user = await this.userService.findByEmailOrUsername(dto.identifier);
    if (user && await compare(dto.password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  async signin(user: UserEntity): Promise<JwtResponse> {
    const payload = { id: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.userService.update(user.id, { lastLogin: new Date().toISOString() });
    await this.userService.update(user.id, { refreshToken });

    return { accessToken, refreshToken };
  }
}