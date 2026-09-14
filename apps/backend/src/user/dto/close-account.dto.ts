import { IsString } from "class-validator";

export class CloseAccountDto {
  @IsString()
  password!: string;
}
