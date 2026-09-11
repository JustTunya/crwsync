import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from "class-validator";

export class CreateTaskChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;
}

export class UpdateTaskChecklistItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content?: string;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;
}
