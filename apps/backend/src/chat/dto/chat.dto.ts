import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateChatRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID("4")
  @IsOptional()
  project_id?: string;
}

export class ChatMessageAttachmentDto {
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

export class SendMessageDto {
  @IsString()
  @MaxLength(4000)
  content!: string;

  @IsUUID("4")
  @IsNotEmpty()
  client_id!: string;

  @IsOptional()
  @IsUUID("4")
  reply_to_id?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  mentionedUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  isEveryoneMention?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageAttachmentDto)
  attachments?: ChatMessageAttachmentDto[];
}

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  message_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  new_content!: string;
}

export class DeleteMessageDto {
  @IsString()
  @IsNotEmpty()
  message_id!: string;
}

export class ToggleReactionDto {
  @IsString()
  @IsNotEmpty()
  message_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emoji!: string;
}

export class MarkAsReadDto {
  @IsString()
  @IsNotEmpty()
  message_id!: string;
}
