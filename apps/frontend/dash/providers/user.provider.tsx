"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SessionUserType } from "@crwsync/types";
import { bootstrapSession } from "@/services/auth.service";

export const UserContext = createContext<SessionUserType | undefined>(undefined);

export function UserProvider({ user, children }: { user: SessionUserType | undefined; children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (currentUser) return;
    let alive = true;
    bootstrapSession().then((u) => { if (alive) setCurrentUser(u); }).catch(() => undefined);
    return () => { alive = false; };
  }, [currentUser]);

  return <UserContext.Provider value={currentUser}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}