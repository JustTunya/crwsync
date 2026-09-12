import { IsString, Length } from "class-validator";

export class SearchQueryDto {
  @IsString()
  @Length(1, 200)
  q!: string;
}
