import { PartialType } from '@nestjs/mapped-types';
import { CreateVerificationDto } from './create-email-verification.dto';

export class UpdateVerificationDto extends PartialType(CreateVerificationDto) {}