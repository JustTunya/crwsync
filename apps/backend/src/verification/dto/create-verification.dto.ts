import { IsEmail, IsOptional, IsBoolean, IsString } from "class-validator";

export class CreateVerificationDto {
  @IsString()
  user_id!: string;

  @IsEmail()
  email!: string;
}