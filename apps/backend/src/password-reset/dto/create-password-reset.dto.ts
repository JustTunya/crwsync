import { IsEmail, IsString } from "class-validator";

export class CreatePasswordResetDto {
  @IsString()
  user_id!: string;

  @IsEmail()
  email!: string;
}