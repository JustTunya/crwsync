import { IsBoolean, IsString } from "class-validator";

export class SigninDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;

  @IsBoolean()
  rememberMe?: boolean;
}