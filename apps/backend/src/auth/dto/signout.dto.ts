import { IsUUID } from "class-validator";

export class SignoutDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  userId!: string;
}