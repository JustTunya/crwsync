import axios, { isAxiosError } from "axios";

export interface WaitlistPayload {
  email: string;
  team_size: string;
  use_case?: string;
}

export interface WaitlistState {
  success: boolean;
  message?: string;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  validateStatus: (status) => status >= 200 && status < 300,
});

export async function joinWaitlist(data: WaitlistPayload): Promise<WaitlistState> {
  try {
    const resp = await api.post("/waitlist", data);
    return { success: true, message: resp.data.message };
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 429) return { success: false, message: "Too many requests. Please try again later." };
      const detail = error.response?.data?.error;
      const message = typeof detail === "string" ? detail : detail?.message;
      return { success: false, message: (Array.isArray(message) ? message[0] : message) || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
