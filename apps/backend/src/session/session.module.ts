import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionEntity } from "src/session/session.entity";
import { SessionService } from "src/session/session.service";
import { SessionController } from "src/session/session.controller";
import { UserEntity } from "src/user/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity, UserEntity])],
  providers: [SessionService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
