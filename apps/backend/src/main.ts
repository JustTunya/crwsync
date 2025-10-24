import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ["https://crwsync.com", "https://www.crwsync.com", "http://localhost:3000"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });
  // Enable trust proxy for correct client IP detection behind proxies
  (app.getHttpAdapter().getInstance() as any).set("trust proxy", true);
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
