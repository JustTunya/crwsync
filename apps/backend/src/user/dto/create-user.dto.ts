import { IsEmail, IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  username!: string;

  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

  @IsISO8601()
  birthdate!: string;

  @IsOptional()
  @IsString()
  avatar_key?: string;

  @IsOptional()
  @IsUUID()
  system_role_id?: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsISO8601()
  last_password_change?: string;

  @IsOptional()
  @IsISO8601()
  email_verified_at?: string;

  @IsOptional()
  @IsISO8601()
  last_login?: string;

  @IsOptional()
  @IsISO8601()
  created_at?: string;

  @IsOptional()
  @IsISO8601()
  updated_at?: string;
}
