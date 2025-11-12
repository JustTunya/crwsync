import { ActiveUser } from "src/common/types/active-user.type";

declare global {
  namespace Express {
    interface User extends ActiveUser {}
  }
}