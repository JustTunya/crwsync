import { IsEmail, IsString } from "class-validator";

export class CreateVerificationDto {
  @IsString()
  user_id!: string;

  @IsEmail()
  email!: string;
}