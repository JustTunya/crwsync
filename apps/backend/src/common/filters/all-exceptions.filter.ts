import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    const rawUrl = req.originalUrl || req.url || "";
    const path = req.path || rawUrl.split("?")[0] || rawUrl;

    this.logger.error(`[${req.method}] ${path} -> ${status}`);

    res.status(status).json({
      statusCode: status,
      path,
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
}