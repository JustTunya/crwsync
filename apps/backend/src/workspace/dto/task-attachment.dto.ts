import { IsString, IsNotEmpty, IsInt, Min } from "class-validator";

export class CreateTaskAttachmentDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  file_name!: string;

  @IsInt()
  @Min(1)
  file_size!: number;

  @IsString()
  @IsNotEmpty()
  mime_type!: string;
}
