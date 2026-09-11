import { IsUUID } from "class-validator";

export class CreateDmDto {
  @IsUUID("4")
  otherUserId!: string;
}
