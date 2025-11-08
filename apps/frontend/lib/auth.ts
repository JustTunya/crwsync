import { cookies } from "next/headers";
import { SessionUserType } from "@crwsync/types";
import axios, { AxiosInstance } from "axios";
import { verifySession } from "@/services/auth.service";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  withCredentials: true,
});

export async function getSession(): Promise<SessionUserType | undefined> {
  try {
    const jar = await cookies();
    const refreshToken = jar.get("refresh_token")?.value;

    if (!refreshToken) {
      return undefined;
    }

    const verifyRes = await verifySession(refreshToken);

    if (verifyRes && verifyRes.expires_at > new Date().toISOString() && !verifyRes.revoked_at) {
      const userRes = await api.get<SessionUserType>(`/users/${verifyRes.user_id}`);
      return userRes.data;
    }

    return undefined;
  } catch {
    console.log("Failed to get session");
    return undefined;
  }
}