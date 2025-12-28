import { Module } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { UserController } from "src/user/user.controller";

@Module({
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}