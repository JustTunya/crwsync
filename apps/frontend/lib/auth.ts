import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { SessionUserType } from "@crwsync/types";
import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  withCredentials: true,
});

export async function getSession(): Promise<SessionUserType | undefined> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return undefined;
    }

    const res = await api.post("/auth/refresh");
    const accessToken = res.data.accessToken as string;

    const { sub } = jwtDecode<{ sub: string }>(accessToken);

    const userRes = await api.get(`/users/${sub}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return userRes.data as SessionUserType;
  } catch {
    return undefined;
  }
}