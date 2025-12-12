import { headers } from "next/headers";
import { SessionUserType } from "@crwsync/types";
import { getMyself } from "@/services/auth.service";

export async function getSession(): Promise<SessionUserType | undefined> {
  try {
    const hdrs = await headers();
    const cookie = hdrs.get("cookie") || undefined;
    
    return await getMyself(cookie);
  } catch {
    return undefined;
  }
}