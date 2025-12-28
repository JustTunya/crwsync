import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, createHash } from "crypto";
import { MailVerificationStatus } from "@crwsync/types";
import { VerificationPublic, verificationPublicSelect } from "src/prisma/selects";
import { CreateVerificationDto } from "src/email-verification/dto/create-email-verification.dto";
import { UpdateVerificationDto } from "src/email-verification/dto/update-email-verification.dto";
import { EmailService } from "src/email/email.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateVerificationDto): Promise<VerificationPublic> {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.user_id, email: dto.email },
      select: { id: true, email_verified_at: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.email_verified_at) {
      throw new BadRequestException("User has already verified their email");
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verification = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.deleteMany({
        where: { email: dto.email, status: MailVerificationStatus.PENDING },
      });

      return tx.emailVerification.create({
        data: {
          user: { connect: { id: user.id } },
          email: dto.email,
          token_hash: hashedToken,
          expires_at: exp,
        },
        select: verificationPublicSelect,
      });
    });

    const appUrl = this.config.get<string>("APP_URL");
    const url = new URL("/auth/verify-email", appUrl);
    url.searchParams.set("token", token);

    await this.emailService.sendEmail({
      to: dto.email,
      subject: "Welcome to CRWSYNC",
      template: "email-verification",
      context: { url: url.toString() },
    });

    return verification;
  }

  findAll(): Promise<VerificationPublic[]> {
    return this.prisma.emailVerification.findMany({ select: verificationPublicSelect });
  }

  async findOne(id: string): Promise<VerificationPublic> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { id },
      select: verificationPublicSelect,
    });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    return verification;
  }

  async findByEmail(email: string): Promise<VerificationPublic> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { email },
      select: verificationPublicSelect,
    });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    return verification;
  }

  async findByToken(token: string): Promise<VerificationPublic> {
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token_hash: hashedToken },
      select: verificationPublicSelect,
    });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }
    return verification;
  }

  async update(id: string, dto: UpdateVerificationDto): Promise<VerificationPublic> {
    const exists = await this.prisma.emailVerification.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Verification not found");
    }

    const data = {
      email: dto.email,
      ...(dto.user_id ? { user: { connect: { id: dto.user_id } } } : {}),
    };

    return this.prisma.emailVerification.update({
      where: { id },
      data,
      select: verificationPublicSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.emailVerification.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Verification not found");
    }
    await this.prisma.emailVerification.delete({ where: { id } });
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token_hash: hashedToken },
      include: { user: true },
    });
    if (!verification) {
      throw new NotFoundException("Verification not found");
    }

    if (verification.status !== MailVerificationStatus.PENDING) {
      throw new NotFoundException("Verification not found");
    }

    if (verification.expires_at && verification.expires_at < new Date()) {
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { status: MailVerificationStatus.EXPIRED },
      });

      throw new NotFoundException("Verification not found");
    }

    if (!verification.user_id) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.user_id },
        data: { email_verified_at: new Date() },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { status: MailVerificationStatus.VERIFIED, verified_at: new Date() },
      }),
    ]);

    return { success: true, message: "Email verified successfully" };
  }

  async getTokenStatus(token: string): Promise<{ status: MailVerificationStatus }> {
    const verification = await this.findByToken(token).catch(() => undefined);
    if (!verification) {
      throw new NotFoundException("Invalid token");
    }

    const status =
      verification.expires_at && verification.expires_at < new Date()
        ? MailVerificationStatus.EXPIRED
        : (verification.status as MailVerificationStatus);

    return { status };
  }

  async resendToken(token: string): Promise<{ success: boolean; message?: string }> {
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const verification = await this.prisma.emailVerification.findUnique({
      where: { token_hash: hashedToken },
      select: { id: true, status: true, user_id: true, email: true },
    });

    if (!verification) {
      throw new NotFoundException("Verification not found");
    }

    if (verification.status === MailVerificationStatus.VERIFIED) {
      throw new BadRequestException("Email is already verified");
    }

    if (!verification.user_id || !verification.email) {
      throw new NotFoundException("User not found for this verification");
    }

    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { status: MailVerificationStatus.REVOKED },
    });

    await this.create({
      user_id: verification.user_id,
      email: verification.email,
    });

    return { success: true, message: "Verification token resent successfully" };
  }
}