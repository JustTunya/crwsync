import { UserGender } from "@crwsync/types";
import { IsIn } from "class-validator";

export class UserGenderDto {
  @IsIn(Object.values(UserGender).map((gender) => gender.value))
  value!: string;

  @IsIn(Object.values(UserGender).map((gender) => gender.label))
  label!: string;
}