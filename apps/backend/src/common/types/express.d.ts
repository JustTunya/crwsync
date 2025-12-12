import { ActiveUser } from "src/common/types/active-user.type";

declare global {
  namespace Express {
    type User = ActiveUser;
  }
}

export {};