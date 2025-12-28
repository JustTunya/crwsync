import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, createHash } from "crypto";
import { hash } from "bcrypt";
import { PasswordResetStatus } from "@crwsync/types";
import { PasswordResetPublic, passwordResetPublicSelect } from "src/prisma/selects";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";
import { UpdatePasswordResetDto } from "src/password-reset/dto/update-password-reset.dto";
import { ResetPasswordDto } from "src/password-reset/dto/reset-password.dto";
import { SessionService } from "src/session/session.service";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/email/email.service";

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePasswordResetDto): Promise<PasswordResetPublic> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const exp = new Date(Date.now() + 60 * 60 * 1000);

    const passwordReset = await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.deleteMany({
        where: { email: dto.email, status: PasswordResetStatus.PENDING },
      });

      return tx.passwordReset.create({
        data: {
          user: { connect: { id: user.id } },
          email: dto.email,
          token_hash: hashedToken,
          expires_at: exp,
        },
        select: passwordResetPublicSelect,
      });
    });

    const appUrl = this.config.get<string>("APP_URL");
    const url = new URL("/auth/reset-password", appUrl);
    url.searchParams.set("token", token);

    await this.emailService.sendEmail({
      to: dto.email,
      subject: "Reset your password",
      template: "reset-password",
      context: { url: url.toString() },
    });

    return passwordReset;
  }

  findAll(): Promise<PasswordResetPublic[]> {
    return this.prisma.passwordReset.findMany({ select: passwordResetPublicSelect });
  }

  async findOne(id: string): Promise<PasswordResetPublic> {
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { id },
      select: passwordResetPublicSelect,
    });
    if (!passwordReset) {
      throw new NotFoundException("Password reset not found");
    }
    return passwordReset;
  }

  async findByEmail(email: string): Promise<PasswordResetPublic> {
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { email },
      select: passwordResetPublicSelect,
    });
    if (!passwordReset) {
      throw new NotFoundException("Password reset not found");
    }
    return passwordReset;
  }

  async findByToken(token: string): Promise<PasswordResetPublic> {
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { token_hash: hashedToken },
      select: passwordResetPublicSelect,
    });
    if (!passwordReset) {
      throw new NotFoundException("Password reset not found");
    }
    return passwordReset;
  }

  async update(id: string, dto: UpdatePasswordResetDto): Promise<PasswordResetPublic> {
    const exists = await this.prisma.passwordReset.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Password reset not found");
    }

    return this.prisma.passwordReset.update({
      where: { id },
      data: { email: dto.email, status: dto.status },
      select: passwordResetPublicSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.passwordReset.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Password reset not found");
    }
    await this.prisma.passwordReset.delete({ where: { id } });
  }

  async reset(dto: ResetPasswordDto): Promise<void> {
    const passwordReset = await this.findByToken(dto.token);
    if (!passwordReset || !passwordReset.user_id) {
      throw new NotFoundException("Password reset not found");
    }

    if (passwordReset.status !== PasswordResetStatus.PENDING) {
      throw new NotFoundException("Password reset is not pending");
    }
    if (passwordReset.expires_at && passwordReset.expires_at < new Date()) {
      throw new NotFoundException("Password reset has expired");
    }

    const user = await this.prisma.user.findUnique({ where: { id: passwordReset.user_id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const hashedPassword = await hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { password_hash: hashedPassword } }),
      this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { status: PasswordResetStatus.USED, reset_at: new Date() },
      }),
    ]);

    await this.sessionService.revokeAll(user.id);
  }

  async getTokenStatus(token: string): Promise<{ status: PasswordResetStatus }> {
    const passwordReset = await this.findByToken(token);

    if (!passwordReset) {
      throw new NotFoundException("Password reset not found");
    }

    if (passwordReset.expires_at && passwordReset.expires_at < new Date()) {
      await this.update(passwordReset.id, { status: PasswordResetStatus.EXPIRED });
      return { status: PasswordResetStatus.EXPIRED };
    }

    return { status: passwordReset.status as PasswordResetStatus };
  }
}