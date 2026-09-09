"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateUserProfilePayload, ChangePasswordPayload } from "@crwsync/types";
import { updateUserProfile, changePassword, getUserSessions, revokeUserSession } from "@/services/user.service";
import { sessionKeys } from "@/hooks/use-session";

export const userKeys = {
  all: ["users"] as const,
  sessions: (userId: string) => [...userKeys.all, "sessions", userId] as const,
};

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserProfilePayload }) => {
      const { success, data: result, message } = await updateUserProfile(userId, data);
      if (!success || !result) throw new Error(message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user() });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: ChangePasswordPayload }) => {
      const { success, message } = await changePassword(userId, data);
      if (!success) throw new Error(message);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.sessions(userId) });
    },
  });
}

export function useUserSessions(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.sessions(userId!),
    queryFn: async () => {
      const { success, data } = await getUserSessions(userId!);
      if (!success || !data) throw new Error("Failed to fetch sessions");
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, sessionId }: { userId: string; sessionId: string }) => {
      const { success, message } = await revokeUserSession(userId, sessionId);
      if (!success) throw new Error(message);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.sessions(userId) });
    },
  });
}
