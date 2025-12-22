import "server-only";

import axios, { AxiosInstance, isAxiosError } from "axios";
import { cache } from "react";
import { cookies } from "next/headers";
import type { SessionUserType } from "@crwsync/types";
import { addInterceptors } from "@/services/auth.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const getServerApi = cache(async (): Promise<AxiosInstance> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  return addInterceptors(
    axios.create({
      baseURL: API_URL,
      withCredentials: true,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 300,
    })
  );
});

export const getSession = cache(async (): Promise<SessionUserType | undefined> => {
  const client = await getServerApi();

  try {
    const me = await client.get("/auth/me");
    return me.data as SessionUserType;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 401) return undefined;
    throw err;
  }
});