"use client";

import { useQuery } from "@tanstack/react-query";
import { bootstrapSession } from "@/services/auth.service";

export const sessionKeys = {
  all: ["session"] as const,
  user: () => [...sessionKeys.all, "user"] as const,
};

export function useSession() {
  return useQuery({
    queryKey: sessionKeys.user(),
    queryFn: async () => {
      const user = await bootstrapSession();
      return user || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    refetchOnWindowFocus: true,
  });
}
