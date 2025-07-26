import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtResponse } from "@crwsync/types";
import { UserService } from "../user/user.service";
import { UserEntity } from "../user/user.entity";
import { SigninDto } from "./signin.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(dto: SigninDto): Promise<UserEntity | null> {
    const user = await this.userService.findByEmailOrUsername(dto.identifier);
    if (user && await bcrypt.compare(dto.password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  async signin(user: UserEntity): Promise<JwtResponse> {
    const payload = { id: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { accessToken: token };
  }
}