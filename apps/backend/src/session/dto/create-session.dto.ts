import { IsUUID, IsNumber, IsIP, IsOptional, IsString, Matches } from "class-validator";


export class CreateSessionDto {
  @IsUUID()
  user_id!: string;

  @IsOptional()
  @IsIP()
  ip?: string;
  
  @IsOptional()
  @IsString()
  @Matches(/^[\w\-./();:@,?=+~%!\s]*$/i, {
    message: "Invalid user-agent format",
  })
  ua?: string;
}