import { cookies } from "next/headers";
import { SessionUserType } from "@crwsync/types";

const API = process.env.NEXT_PUBLIC_API_URL!;

export async function getSession(): Promise<SessionUserType | undefined> {
  try {
    const cookie = (await cookies()).toString();

    const res = await fetch(`${API}/sessions/verify`, {
      method: "POST",
      headers: { cookie },
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) {
      return undefined;
    }
    const data = await res.json();

    if (data && data.email && data.username) {
      return data as SessionUserType;
    }

    if (data?.userId) {
      const userRes = await fetch(`${API}/users/${data.userId}`, {
        headers: { cookie },
        cache: "no-store",
        credentials: "include",
      });
      if (!userRes.ok) {
        return undefined;
      }
      const user = await userRes.json();
      const sessionUser: SessionUserType = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar_key: user.avatar_key,
        role: user.role,
      };
      return sessionUser;
    }

    return undefined;
  } catch {
    return undefined;
  }
}