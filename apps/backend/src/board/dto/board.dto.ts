import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
  IsInt,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { TaskPriorityEnum, ColumnType } from "@prisma/client";

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID("4")
  @IsOptional()
  project_id?: string;
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

  @IsEnum(ColumnType)
  @IsOptional()
  type?: ColumnType;
}

export class UpdateColumnDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsEnum(ColumnType)
  @IsOptional()
  type?: ColumnType;
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

  @IsBoolean()
  @IsOptional()
  is_deleted?: boolean;

  @IsBoolean()
  @IsOptional()
  is_archived?: boolean;

  @IsDateString()
  @IsOptional()
  in_progress_at?: string | null;

  @IsDateString()
  @IsOptional()
  completed_at?: string | null;
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

export class ReorderModuleUpdateDto {
  @IsUUID("4")
  id!: string;

  @IsUUID("4")
  @IsOptional()
  project_id?: string | null;

  @IsInt()
  position!: number;
}

export class ReorderModulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderModuleUpdateDto)
  updates!: ReorderModuleUpdateDto[];
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class UpdateModuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
