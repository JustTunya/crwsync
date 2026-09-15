import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { RedisModule } from "src/redis/redis.module";
import { StatisticsController } from "src/statistics/statistics.controller";
import { StatisticsService } from "src/statistics/statistics.service";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
