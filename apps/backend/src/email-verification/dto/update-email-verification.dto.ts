import { PartialType } from "@nestjs/mapped-types";
import { CreateVerificationDto } from "src/email-verification/dto/create-email-verification.dto";

export class UpdateVerificationDto extends PartialType(CreateVerificationDto) {}