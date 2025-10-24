import type { Request } from "express";

export function getClientIp(req: Request): string | undefined {
  const xForwardedFor = req.headers["x-forwarded-for"] as string | undefined;
  const ip = xForwardedFor?.split(",")[0].trim()
    || req.headers["x-real-ip"] as string | undefined
    || req.headers["cf-connecting-ip"] as string | undefined
    || req.ip;
  return ip;
}

export function getUserAgent(req: Request): string | undefined {
  return req.headers["user-agent"] as string | undefined;
}