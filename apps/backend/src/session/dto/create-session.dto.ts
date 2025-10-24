import { IsUUID, IsIP, IsOptional, IsString, Matches } from "class-validator";


export class CreateSessionDto {
  @IsUUID()
  user_id!: string;
}