import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";

export class RotateSessionDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsString()
  old_token!: string;

  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
}