import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { WorkspaceRoleEnum } from '@prisma/client';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logo_key?: string;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(WorkspaceRoleEnum)
  role: WorkspaceRoleEnum;
}