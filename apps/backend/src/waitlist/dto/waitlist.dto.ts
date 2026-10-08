import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export const TEAM_SIZES = ["1", "2-5", "6-15", "16-50", "50+"];

export class WaitlistDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(TEAM_SIZES)
  team_size!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  use_case?: string;
}
