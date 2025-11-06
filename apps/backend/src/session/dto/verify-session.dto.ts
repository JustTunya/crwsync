import { IsString, IsUUID } from "class-validator";


export class VerifySessionDto {
  @IsUUID()
  user_id!: string;

  @IsString()
  token!: string;
}