import { PartialType } from "@nestjs/mapped-types";
import { CreateSessionDto } from "src/session/dto/create-session.dto";

export class UpdateSessionDto extends PartialType(CreateSessionDto) {}