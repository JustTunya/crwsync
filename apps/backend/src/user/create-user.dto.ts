import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { UserRole, UserStatus, UserPreference, UserProfile, UserGenderValue } from '@crwsync/types';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  username!: string;

  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

  @IsEnum(UserGenderValue, { message: 'gender must be one of: ' + Object.values(UserGenderValue).join(', ') })
  gender!: UserGenderValue;

  @IsISO8601()
  birthdate!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsObject()
  preferences?: UserPreference;

  @IsOptional()
  @IsObject()
  profile?: UserProfile;

  @IsString()
  password!: string;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsISO8601()
  updatedAt?: string;

  @IsOptional()
  @IsISO8601()
  lastLogin?: string;
}
