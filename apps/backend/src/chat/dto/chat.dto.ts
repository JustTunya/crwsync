import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsOptional,
} from "class-validator";

export class CreateChatRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsUUID("4")
  @IsNotEmpty()
  client_id!: string;

  @IsOptional()
  @IsUUID("4")
  reply_to_id?: string;
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
