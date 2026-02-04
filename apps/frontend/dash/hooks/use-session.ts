"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bootstrapSession, signout } from "@/services/auth.service";
import { useRouter } from "next/navigation";

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

export function useSignout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: signout,
    onSuccess: () => {
      queryClient.setQueryData(sessionKeys.user(), null);
      queryClient.clear();
      router.push("/auth/signin");
    },
  });
}
