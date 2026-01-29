import { SetMetadata } from '@nestjs/common';
import { WorkspaceRoleEnum } from '@prisma/client';

export const ROLES_KEY = 'workspace_roles';
export const RequireWorkspaceRoles = (...roles: WorkspaceRoleEnum[]) => SetMetadata(ROLES_KEY, roles);