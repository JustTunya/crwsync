import axios, { isAxiosError } from "axios";

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export interface ContactState {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status >= 200 && status < 300,
});

export async function submitContactMessage(data: ContactPayload): Promise<ContactState> {
  try {
    const resp = await api.post("/contact", data);
    return { success: true, message: resp.data.message || "Message sent successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 429) {
        return { success: false, message: "Too many requests. Please try again later." };
      }
      const resp = error.response?.data;
      return { success: false, errors: resp?.errors || {}, message: resp?.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
