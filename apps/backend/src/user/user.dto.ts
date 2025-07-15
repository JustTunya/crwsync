import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsObject,
} from 'class-validator';
import { UserRole, UserStatus, UserPreference, UserProfile } from '@crwsync/types';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  username!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsISO8601()
  birthdate!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];

  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsObject()
  preferences!: UserPreference;

  @IsOptional()
  @IsObject()
  profile?: UserProfile;

  @IsString()
  password!: string;
}
