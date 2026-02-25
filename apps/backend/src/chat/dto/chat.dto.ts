import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
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
}
