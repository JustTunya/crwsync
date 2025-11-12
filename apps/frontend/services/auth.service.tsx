import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { 
  SignupState, SignupPayload, SigninState, SigninPayload, ForgotPasswordState, ForgotPasswordPayload, ResetPasswordState, ResetPasswordPayload, SessionUserType,
  MailVerificationStatus
} from "@crwsync/types";

let refreshPromise: Promise<void> | undefined = undefined;

function addInterceptors(client: AxiosInstance): AxiosInstance {
  client.interceptors.response.use((resp) => resp, async (error) => {
    const status = error?.response?.status as number | undefined;
    const request: (AxiosRequestConfig & { _retry?: boolean }) | undefined = error?.config;

    if (!request) {
      return Promise.reject(error);
    }

    const url = request.url || "";
    const excludedPaths = ["/auth/refresh", "/auth/signin", "/auth/signout"];

    if (status === 401 && !request._retry && !excludedPaths.includes(url)) {
      request._retry = true;

      try {
        if (!refreshPromise) {
          const cookieHeader = (request.headers as Record<string, any> | undefined)?.["cookie"];
          refreshPromise = api
            .post("/auth/refresh", {}, cookieHeader ? { headers: { cookie: cookieHeader } } : undefined)
            .then(() => undefined)
            .finally(() => { refreshPromise = undefined;});
        }
        await refreshPromise;
        return api(request);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  });

  return client;
}

const api: AxiosInstance = addInterceptors(
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    withCredentials: true,
  })
);

export function getApiClient(cookie?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    withCredentials: true,
    headers: cookie ? { cookie } : undefined,
  });

  return addInterceptors(instance);
}

export async function signup(_prev: SignupState, data: SignupPayload): Promise<SignupState> {
  try {
    const user = await api.post("/auth/signup", data);

    return { success: true, errors: {}, message: "Signup successful", userId: user.data.id };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data as SignupState;
      return { success: false, errors: resp.errors, message: resp.message };
    }
    return { success: false, errors: {}, message: "An unexpected error occurred" };
  }
}

export async function signin(_prev: SigninState, data: SigninPayload): Promise<SigninState> {
  try {
    await api.post("/auth/signin", data);
    return { success: true, errors: {}, message: "Signin successful" };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data as SigninState;
      return { success: false, errors: resp.errors, message: resp.message };
    }
    return { success: false, errors: {}, message: "An unexpected error occurred" };
  }
}

export async function signout(): Promise<{ success: boolean; message?: string }> {
  try {
    await api.post("/auth/signout");
    return { success: true, message: "Signout successful" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { success: true, message: "Already signed out" };
    }
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function forgotPassword(_prev: ForgotPasswordState, data: ForgotPasswordPayload): Promise<ForgotPasswordState> {
  try {
    await api.post("/password-resets", data);
    return {
      success: true,
      errors: {},
      message: "Password reset link sent to your email",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp.errors || {}, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, errors: {}, message: "An unexpected error occurred" };
  }
}

export async function resetPassword(_prev: ResetPasswordState, data: ResetPasswordPayload): Promise<ResetPasswordState> {
  try {
    await api.post("/password-resets/reset", data);
    return {
      success: true,
      errors: {},
      message: "Password reset successful",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp.errors || {}, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, errors: {}, message: "An unexpected error occurred" };
  }
}

export async function getResetToken(token: string): Promise<{ status: "pending" | "used" | "expired" | "revoked" } | undefined> {
  try {
    const response = await api.get("/password-resets/token-status", {
      params: { token }
    });
    return response.data as { status: "pending" | "used" | "expired" | "revoked" };
  } catch {
    return undefined;
  }
}

export async function checkAvailability(field: 'email' | 'username', value: string): Promise<{ available: boolean }> {
  try {
    const response = await api.get("/users/check-availability", {
      params: { field, value }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      if (resp && resp.available !== undefined) {
        return { available: resp.available };
      }
    }
    return { available: false };
  }
}

export async function sendVerificationEmail(email: string, userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    await api.post("/email-verifications", { email, user_id: userId });
    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getEmailVerificationStatus(token: string): Promise<{ status: MailVerificationStatus } | undefined> {
  try {
    const response = await api.get("/email-verifications/token-status", {
      params: { token }
    });
    return response.data as { status: MailVerificationStatus };
  } catch {
    return undefined;
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.get("/email-verifications/verify", {
      params: { token }
    });
    return { success: response.data.success, message: response.data.message || "Email verified successfully" };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getMyself(cookie?: string): Promise<SessionUserType | undefined> {
  const client = cookie ? getApiClient(cookie) : api;
  
  try {
    const response = await client.get("/auth/me");
    return response.data as SessionUserType;
  } catch {
    return undefined;
  }
}