import { IsBoolean, IsOptional, IsUUID } from "class-validator";


export class CreateSessionDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  user_id!: string;

  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
}