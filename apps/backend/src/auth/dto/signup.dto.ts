import { IsEmail, IsISO8601, IsOptional, IsString, IsUUID, Matches, MinLength } from "class-validator";

export class SignupDto {
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
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
    { message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character." }
  )
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
