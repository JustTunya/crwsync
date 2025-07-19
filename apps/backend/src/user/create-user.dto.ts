import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsObject,
  IsPhoneNumber
} from 'class-validator';
import { UserRole, UserStatus, UserPreference, UserProfile } from '@crwsync/types';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsPhoneNumber(undefined, { message: 'Invalid phone number format' })
  phone!: string;

  @IsString()
  username!: string;

  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

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
}
