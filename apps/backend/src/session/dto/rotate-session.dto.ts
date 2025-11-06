import { IsBoolean, IsIP, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class RotateSessionDto {
  @IsUUID()
  user_id!: string;

  @IsString()
  old_token!: string;

  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
}