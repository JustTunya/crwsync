import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { WorkspaceRoleEnum } from '@prisma/client';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;
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
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEnum(WorkspaceRoleEnum)
  role!: WorkspaceRoleEnum;
}

export class UpdateMemberRoleDto {
  @IsEnum(WorkspaceRoleEnum)
  role!: WorkspaceRoleEnum;
}