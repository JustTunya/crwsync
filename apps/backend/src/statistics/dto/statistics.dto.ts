import { IsOptional, IsEnum, IsString } from "class-validator";
import { StatisticsInterval } from "@crwsync/types";

export const STATISTICS_INTERVALS: StatisticsInterval[] = [
  "7d",
  "14d",
  "30d",
  "90d",
  "6m",
  "1y",
  "all",
];

export class StatisticsQueryDto {
  @IsOptional()
  @IsEnum(STATISTICS_INTERVALS)
  interval?: StatisticsInterval = "30d";

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  boardId?: string;
}
