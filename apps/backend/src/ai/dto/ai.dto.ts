import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class SummaryDto {
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}

export class DigestDto {
  @IsDateString()
  @IsOptional()
  since?: string;
}

export class TaskDraftsDto {
  @IsUUID("4")
  boardId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  messageIds!: string[];
}

export class StandupDto {
  @IsUUID("4")
  @IsOptional()
  memberId?: string;

  @IsDateString()
  @IsOptional()
  since?: string;
}
