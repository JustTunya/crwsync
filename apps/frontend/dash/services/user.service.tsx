import { isAxiosError } from "axios";
import { UserType, UserOperationState, WorkspaceInvite, UpdateUserProfilePayload, ChangePasswordPayload, ActiveSession } from "@crwsync/types";
import { api } from "@/services/auth.service";

export async function getUserById(userId: string): Promise<UserOperationState<UserType>> {
  try {
    const response = await api.get(`/users/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch user" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
} 

export async function getUsersByIdentifier(identifier: string, workspaceId?: string): Promise<UserOperationState<UserType[]>> {
  try {
    const url = new URLSearchParams();
    url.append("identifier", identifier);
    if (workspaceId) url.append("workspaceId", workspaceId);

    const response = await api.get(`/users/search?${url.toString()}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to search users" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getInvites(userId: string): Promise<UserOperationState<WorkspaceInvite[]>> {
  try {
    const response = await api.get<WorkspaceInvite[]>(`/users/${userId}/invites`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch invites" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateUserProfile(userId: string, data: UpdateUserProfilePayload): Promise<UserOperationState<UserType>> {
  try {
    const response = await api.patch(`/users/${userId}`, data);
    return { success: true, message: "Profile updated successfully", data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp?.errors || {}, message: resp?.message || "Failed to update profile" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function changePassword(userId: string, data: ChangePasswordPayload): Promise<UserOperationState> {
  try {
    await api.post(`/users/${userId}/change-password`, data);
    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp?.errors || {}, message: resp?.message || "Failed to change password" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getUserSessions(userId: string): Promise<UserOperationState<ActiveSession[]>> {
  try {
    const response = await api.get<ActiveSession[]>(`/users/${userId}/sessions`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch sessions" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<UserOperationState> {
  try {
    await api.delete(`/users/${userId}/sessions/${sessionId}`);
    return { success: true, message: "Session revoked" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to revoke session" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}