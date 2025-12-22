import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, isAxiosError } from "axios";
import { 
  SignupState, SignupPayload, SigninState, SigninPayload, ForgotPasswordState, ForgotPasswordPayload, ResetPasswordState, ResetPasswordPayload, SessionUserType, MailVerificationStatus
} from "@crwsync/types";

type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

function getCookieHeader(config?: AxiosRequestConfig): string | undefined {
  const headers = (config?.headers ?? {}) as AxiosRequestHeaders;
  return (headers.cookie as string | undefined) ?? (headers.Cookie as string | undefined);
}

function isUnauthorized(err: unknown): err is AxiosError {
  return isAxiosError(err) && err.response?.status === 401;
}

function getPathName(reqUrl: string | undefined, baseUrl: string): string {
  if (!reqUrl) return "";

  try {
    return new URL(reqUrl, baseUrl).pathname;
  } catch {
    return reqUrl.split("?")[0] ?? reqUrl;
  }
}

async function withAuthRetry<T>(client: AxiosInstance, req: () => Promise<T>, opts?: { cookie?: string }): Promise<T> {
  try {
    return await req();
  } catch (error) {
    if (isUnauthorized(error)) throw error;

    const refreshConfig: AxiosRequestConfig | undefined = opts?.cookie
      ? { headers: { cookie: opts.cookie } }
      : undefined;

    await client.post("/auth/refresh", {}, refreshConfig);

    return req();
  }
}

function addInterceptors(client: AxiosInstance): AxiosInstance {
  let refreshPromise: Promise<void> | undefined = undefined;

  client.interceptors.response.use((resp) => resp, async (error: AxiosError) => {
    const request = error.config as RetriableRequestConfig | undefined;
    if (!request) return Promise.reject(error);

    const status = error?.response?.status;
    if (status && status !== 401) return Promise.reject(error);

    const baseUrl = client.defaults.baseURL || "";
    const pathname = getPathName(request.url, baseUrl);

    const excluded = new Set(["/auth/refresh", "/auth/signin", "/auth/signout"]);
    if (excluded.has(pathname)) return Promise.reject(error);

    if (request._retry) return Promise.reject(error);
    request._retry = true;

    try {
      if (!refreshPromise) {
        const cookieHeader = getCookieHeader(request);
          
        refreshPromise = client
          .post("/auth/refresh", {}, cookieHeader ? { headers: { cookie: cookieHeader } } : undefined)
          .then(() => undefined)
          .finally(() => { refreshPromise = undefined;});
      }

      await refreshPromise;
      return client(request);
    } catch {
      return Promise.reject(error);
    }
  });

  return client;
}

const api: AxiosInstance = addInterceptors(
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    withCredentials: true,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 300,
  })
);

export function getApiClient(cookie?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    withCredentials: true,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie && { cookie }),
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 300,
  });

  return addInterceptors(instance);
}

export async function signup(_prev: SignupState, data: SignupPayload): Promise<SignupState> {
  try {
    const user = await api.post("/auth/signup", data);

    return { success: true, errors: {}, message: "Signup successful", userId: user.data.id };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data as SignupState;
      return { success: false, errors: resp.errors, message: resp.message };
    }
    return { success: false, errors: {}, message: "An unexpected error occurred" };
  }
}

export async function signin(_prev: SigninState, data: SigninPayload): Promise<SigninState> {
  try {
    const resp = await api.post("/auth/signin", data);
    return { success: true, errors: {}, message: resp.data.message || "Signin successful" };
  } catch (error) {
    if (isAxiosError(error)) {
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
    if (isAxiosError(error) && error.response?.status === 401) {
      return { success: true, message: "Already signed out" };
    }
    if (isAxiosError(error)) {
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
    if (isAxiosError(error)) {
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
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp.errors || {}, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, errors: {}, message: "An unexpected error occurred" };
  }
}

export async function getResetToken(token: string): Promise<{ status: "pending" | "used" | "expired" | "revoked" } | undefined> {
  try {
    const resp = await api.get("/password-resets/token-status", {
      params: { token }
    });
    return resp.data as { status: "pending" | "used" | "expired" | "revoked" };
  } catch {
    return undefined;
  }
}

export async function checkAvailability(field: 'email' | 'username', value: string): Promise<{ available: boolean }> {
  try {
    const resp = await api.get("/users/check-availability", {
      params: { field, value }
    });
    return resp.data;
  } catch (error) {
    if (isAxiosError(error)) {
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
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function resendVerificationEmail(token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.post("/email-verifications/resend-token", { token });
    return { success: response.data.success ?? true, message: response.data.message ?? "Verification token resent successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.get("/email-verifications/verify", {
      params: { token }
    });
    return { success: response.data.success ?? true, message: response.data.message ?? "Email verified successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getEmailVerificationStatus(token: string): Promise<{ status: MailVerificationStatus } | undefined> {
  try {
    const resp = await api.get("/email-verifications/token-status", {
      params: { token }
    });
    return resp.data as { status: MailVerificationStatus };
  } catch {
    return undefined;
  }
}

export async function getMyself(cookie?: string): Promise<SessionUserType | undefined> {
  const client = cookie ? getApiClient(cookie) : api;
  
  try {
    const resp = await client.get("/auth/me");
    return resp.data as SessionUserType;
  } catch (err) {
    return undefined;
  }
}