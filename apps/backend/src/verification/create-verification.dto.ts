import { IsEmail, IsOptional, IsBoolean, IsString } from "class-validator";

export class CreateVerificationDto {
  @IsString()
  userId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}