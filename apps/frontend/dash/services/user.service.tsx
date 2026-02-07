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