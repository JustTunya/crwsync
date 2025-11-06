import { cookies } from "next/headers";
import { SessionUserType } from "@crwsync/types";
import { getCurrentUser, verifySession } from "@/services/auth.service";

export async function getSession(): Promise<SessionUserType | undefined> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;
    
    if (!accessToken || !refreshToken) {
      return undefined;
    }

    const res = await verifySession(refreshToken);

    if (res && res.user_id) {
      const user = await getCurrentUser(res.user_id);
      if (!user) {
        return undefined;
      }
      return user;
    }

    return undefined;
  } catch {
    return undefined;
  }
}