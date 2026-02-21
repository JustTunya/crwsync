"use client";

import { createContext, useContext } from "react";
import { SessionUserType } from "@crwsync/types";
import { useSession } from "@/hooks/use-session";

export const UserContext = createContext<SessionUserType | null | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useSession();

  return <UserContext.Provider value={user ?? null}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}