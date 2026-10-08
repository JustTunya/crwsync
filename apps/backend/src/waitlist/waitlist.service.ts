import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { WaitlistDto } from "src/waitlist/dto/waitlist.dto";

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async join(dto: WaitlistDto): Promise<void> {
    try {
      await this.prisma.waitlistEntry.create({
        data: { email: dto.email, team_size: dto.team_size, use_case: dto.use_case?.trim() || null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    }
  }
}
