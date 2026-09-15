import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";
import { TaskPriorityEnum } from "@prisma/client";
import { ScheduleScope } from "@crwsync/types";

export class GetSchedulesQueryDto {
  @IsOptional()
  @IsEnum(["assigned_to_me", "created_by_me", "all"])
  scope?: ScheduleScope = "assigned_to_me";

  @IsOptional()
  @IsUUID("4")
  boardId?: string;

  @IsOptional()
  @IsEnum(TaskPriorityEnum)
  priority?: TaskPriorityEnum;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  includeCompleted?: boolean = false;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
