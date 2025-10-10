import { IsIP, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class RotateSessionDto {
  @IsUUID()
  user_id!: string;

  @IsString()
  old_token!: string;

  @IsOptional()
  @IsIP()
  ip?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\w\-./();:@,?=+~%!\s]*$/i, {
    message: "Invalid user-agent format",
  })
  ua?: string;
}