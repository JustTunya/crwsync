import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, isAxiosError } from "axios";
import { SessionUserType } from "@crwsync/types";

let refreshPromise: Promise<void> | undefined;

type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

function addInterceptors(client: AxiosInstance): AxiosInstance {
  client.interceptors.response.use((resp) => resp, async (error: AxiosError) => {
    const status = error?.response?.status;
    const request = error.config as RetriableRequestConfig | undefined;

    if (!request) return Promise.reject(error);

    const url = request.url || "";
    const excludedPaths = ["/auth/refresh", "/auth/signin", "/auth/signout"];

    if (status === 401 && !request._retry && !excludedPaths.includes(url)) {
      request._retry = true;

      try {
        if (!refreshPromise) {
          const headers = request.headers as AxiosRequestHeaders | undefined;
          const cookieHeader = (headers?.cookie as string | undefined) ?? (headers?.Cookie as string | undefined);

          refreshPromise = client
            .post("/auth/refresh", {}, cookieHeader ? { headers: { cookie: cookieHeader } } : undefined)
            .then(() => undefined)
            .finally(() => {
              refreshPromise = undefined;
            });
        }

        await refreshPromise;
        return client(request);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  });

  return client;
}

const api: AxiosInstance = addInterceptors(
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    withCredentials: true,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
    maxRedirects: 5,
    validateStatus: (status) => status < 500
  })
);

export function getApiClient(cookie?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    withCredentials: true,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      ...(cookie && { cookie })
    },
    maxRedirects: 5,
    validateStatus: (status) => status < 500
  });

  return addInterceptors(instance);
}

export async function getMyself(cookie?: string): Promise<SessionUserType | undefined> {
  const client = cookie ? getApiClient(cookie) : api;

  try {
    const response = await client.get("/auth/me");
    return response.data as SessionUserType;
  } catch {
    return undefined;
  }
}

export async function signout(): Promise<{ success: boolean; message?: string }> {
  try {
    await api.post("/auth/signout");
    return { success: true, message: "Signout successful" };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return { success: true, message: "Already signed out" };
    }
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}