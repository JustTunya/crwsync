"use client";
import { createContext, useContext } from "react";
import { SessionUserType } from "@crwsync/types";

export const UserContext = createContext<SessionUserType | undefined>(undefined);

export function UserProvider({ user, children }: { user: SessionUserType | undefined, children: React.ReactNode }) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}