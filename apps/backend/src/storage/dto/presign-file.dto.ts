import { IsString, IsNotEmpty } from "class-validator";

export class PresignFileDto {
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;
}
