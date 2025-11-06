import { IsString } from "class-validator";


export class VerifySessionDto {
  @IsString()
  token!: string;
}