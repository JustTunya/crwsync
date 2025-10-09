import { IsEmail, IsString } from "class-validator";

export class CreatePasswordResetDto {
  @IsEmail()
  email!: string;
}