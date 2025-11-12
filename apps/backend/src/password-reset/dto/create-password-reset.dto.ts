import { IsEmail, IsEnum, IsOptional } from "class-validator";
import { PasswordResetStatus } from "@crwsync/types";

export class CreatePasswordResetDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(PasswordResetStatus)
  status?: PasswordResetStatus;
}