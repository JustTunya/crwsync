import { IsBoolean, IsJWT, IsString } from "class-validator";


export class RefreshDto {
  @IsString()
  refreshToken!: string;

  @IsJWT()
  accessToken!: string;

  @IsBoolean()
  persistent?: boolean;
}