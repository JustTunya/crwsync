import { SetMetadata } from "@nestjs/common";
import { RoleEnum } from "@crwsync/types";
import { ROLES_KEY } from "src/common/constants";

export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);