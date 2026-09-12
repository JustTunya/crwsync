import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SearchController } from "src/search/search.controller";
import { SearchService } from "src/search/search.service";

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
