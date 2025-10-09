import { IsEmail, IsString } from "class-validator";

export class CreateVerificationDto {
  @IsEmail()
  email!: string;
}