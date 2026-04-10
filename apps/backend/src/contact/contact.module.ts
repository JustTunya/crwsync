import { Module } from "@nestjs/common";
import { ContactController } from "src/contact/contact.controller";
import { ContactService } from "src/contact/contact.service";
import { EmailModule } from "src/email/email.module";

@Module({
  imports: [EmailModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
