import { IsEmail, IsUUID } from "class-validator";

export class CreateVerificationDto {
  @IsUUID()
  user_id!: string;
  
  @IsEmail()
  email!: string;
}