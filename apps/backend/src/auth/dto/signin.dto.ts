import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SigninDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}