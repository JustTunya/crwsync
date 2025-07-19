import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AppController } from './app.controller.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppService } from './app.service.js';

@Module({
  imports: [DatabaseModule, UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
