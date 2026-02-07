import { isAxiosError } from "axios";
import { UserType, UserOperationState } from "@crwsync/types";
import { api } from "@/services/auth.service";

export async function getUsersByIdentifier(identifier: string): Promise<UserOperationState<UserType[]>> {
  try {
    const response = await api.get(`/users/search?identifier=${encodeURIComponent(identifier)}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to search users" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export interface Invite {
  id: string;
  role: string;
  status: string;
  created_at: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  creator: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
    avatar_key: string | null;
  };
}

export async function getInvites(userId: string): Promise<UserOperationState<Invite[]>> {
  try {
    const response = await api.get(`/users/${userId}/invites`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch invites" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}