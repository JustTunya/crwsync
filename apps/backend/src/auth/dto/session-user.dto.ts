import { IsEmail, IsEnum, IsNumber, IsString, IsUUID } from "class-validator";
import { RoleEnum } from "@crwsync/types";

export class SessionUserDto {
  @IsUUID()
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  username!: string;

  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

  @IsString()
  avatar_key?: string;

  @IsEnum(RoleEnum)
  role!: RoleEnum;

  @IsNumber()
  role_version!: number;
}