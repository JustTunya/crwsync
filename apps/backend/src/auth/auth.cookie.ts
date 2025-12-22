import { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const accessCookieDomain = isProduction ? process.env.ACCESS_COOKIE_DOMAIN : undefined;
const refreshCookieDomain = isProduction ? process.env.REFRESH_COOKIE_DOMAIN : undefined;

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  persistent?: boolean,
) {
  const accessMaxAge = 15 * 60 * 1000;
  const refreshMaxAge = persistent
    ? 30 * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  res.cookie("crw-at", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
    domain: accessCookieDomain,
  });

  res.cookie("crw-rt", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
    domain: refreshCookieDomain,
  });
}