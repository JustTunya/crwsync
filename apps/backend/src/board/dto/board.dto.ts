import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
  IsInt,
} from "class-validator";
import { TaskPriorityEnum } from "@prisma/client";

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateBoardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateColumnDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateColumnDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriorityEnum)
  @IsOptional()
  priority?: TaskPriorityEnum;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsUUID("4")
  @IsOptional()
  assignee_id?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsUUID("4")
  @IsNotEmpty()
  column_id!: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriorityEnum)
  @IsOptional()
  priority?: TaskPriorityEnum;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsUUID("4")
  @IsOptional()
  assignee_id?: string | null;

  @IsDateString()
  @IsOptional()
  due_date?: string | null;
}

export class MoveTaskDto {
  @IsUUID("4")
  @IsNotEmpty()
  column_id!: string;

  @IsInt()
  position!: number;
}

export class ReorderColumnsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  column_ids!: string[];
}

export class ReorderModulesDto {
  @IsArray()
  @IsUUID("4", { each: true })
  module_ids!: string[];
}
