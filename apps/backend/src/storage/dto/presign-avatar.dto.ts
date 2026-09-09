import { IsString } from "class-validator";

export class PresignAvatarDto {
  @IsString()
  contentType!: string;
}
