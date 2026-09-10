import { IsString, IsNotEmpty, IsUUID, IsOptional, IsInt, Min } from "class-validator";

export class CreateFileRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID("4")
  @IsOptional()
  project_id?: string;
}

export class CreateWorkspaceFileDto {
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
