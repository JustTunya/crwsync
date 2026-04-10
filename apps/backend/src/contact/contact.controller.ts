import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "src/common/decorators/public.decorator";
import { ContactService } from "src/contact/contact.service";
import { ContactDto } from "src/contact/dto/contact.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  async submitContact(@Body() dto: ContactDto) {
    await this.contactService.submitContact(dto);
    return { success: true, message: "Contact message sent successfully" };
  }
}
