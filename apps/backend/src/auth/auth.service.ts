import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtResponse } from "@crwsync/types";
import { UserService } from "../user/user.service";
import { EmailService } from "../email/email.service";
import { UserEntity } from "../user/user.entity";
import { SigninDto } from "./dto/signin.dto";
import { compare } from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(dto: SigninDto): Promise<UserEntity | null> {
    const user = await this.userService.findByEmailOrUsername(dto.identifier);
    if (user && await compare(dto.password, user.password_hash)) {
      return user;
    }
    return null;
  }

  async signin(user: UserEntity): Promise<JwtResponse> {
    const payload = { id: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.userService.update(user.id, { last_login: new Date().toISOString() });
    await this.userService.update(user.id, { refresh_token: refreshToken });

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userService.findByEmailOrUsername(email);
    if (!user) {
      return { success: false, message: 'Email not found' };
    }

    const resetToken = this.jwtService.sign({ id: user.id }, { expiresIn: '1h' });

    await this.emailService.sendEmail({ 
      to: user.email, 
      subject: 'Reset your password',
      template: 'reset-password', 
      context: { 
        url: `https://crwsync.com/reset-password?token=${resetToken}`
      } 
    });

    return { success: true, message: "Password reset email sent" };
  }
}