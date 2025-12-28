import { ClassSerializerInterceptor, Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "src/app.module";
import { AllExceptionsFilter } from "src/common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "src/common/interceptors/logging.interceptor";
import { TimeoutInterceptor } from "src/common/interceptors/timeout.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger("Bootstrap");
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);
  
  app.enableShutdownHooks(["SIGINT", "SIGTERM"]);

  app.use(helmet());
  app.use(compression());
  app.use(json({ limit : "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  app.getHttpAdapter().getInstance().set("trust proxy", true);

  const origin = (config.get<string>("CORS_ORIGIN") || "")
    .split(",").map((o) => o.trim()).filter(Boolean);
  if (!origin.length) {
    logger.error("CORS_ORIGIN must be set");
    process.exit(1);
  }
  app.enableCors({
    origin: (reqo: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!reqo) return callback(null, true); // allow same-origin & tools
      callback(null, origin.includes(reqo));
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  const cookieSecret = config.get<string>("COOKIE_SECRET");
  app.use(cookieParser(cookieSecret));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new LoggingInterceptor(),
    new TimeoutInterceptor(10000)
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.get<number>("PORT") ?? 8080;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();