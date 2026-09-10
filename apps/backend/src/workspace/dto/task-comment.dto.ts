import { IsString, IsNotEmpty, MaxLength, IsOptional, IsArray, IsUUID } from "class-validator";

export class CreateTaskCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  mentionedUserIds?: string[];
}

export class UpdateTaskCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}
