import { Injectable } from "@nestjs/common";

@Injectable()
export class PilotService {
  ping(): string {
    return "ok";
  }
}
