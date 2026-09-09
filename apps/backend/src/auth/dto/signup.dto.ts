import { IsEmail, IsISO8601, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  username!: string;

  @IsString()
  firstname!: string;

  @IsString()
  lastname!: string;

  @IsISO8601()
  birthdate!: string;

  @IsOptional()
  @IsString()
  avatar_key?: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
    { message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character." }
  )
  password!: string;
}

