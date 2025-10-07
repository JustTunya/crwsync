import { PartialType } from "@nestjs/mapped-types";
import { CreatePasswordResetDto } from "src/password-reset/dto/create-password-reset.dto";

export class UpdatePasswordResetDto extends PartialType(CreatePasswordResetDto) {}