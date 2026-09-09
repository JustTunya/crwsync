import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateUserDto } from "src/user/dto/create-user.dto";

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ["password"] as const)) {}
