import axios, { AxiosInstance } from "axios";
import { 
  SignupState, 
  SignupPayload, 
  SigninState, 
  SigninPayload,
  ForgotPasswordState,
  ForgotPasswordPayload,
  ResetPasswordState,
  ResetPasswordPayload,
  MailVerification
} from "@crwsync/types";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  withCredentials: true,
});

export async function signup(_prev: SignupState, data: SignupPayload): Promise<SignupState> {
  try {
    const user = await api.post("/users", data);
    sendVerificationEmail(data.email, user.data.id);

    return {
      success: true,
      errors: {},
      message: "Signup successful",
      userId: user.data.id
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data as SignupState;
      return {
        success: false,
        errors: resp.errors,
        message: resp.message,
      };
    }
    return {
      success: false,
      errors: {},
      message: "An unexpected error occurred",
    };
  }
}

export async function signin(_prev: SigninState, data: SigninPayload): Promise<SigninState> {
  try {
    await api.post("/auth/signin", data);
    return {
      success: true,
      errors: {},
      message: "Signin successful",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data as SigninState;
      return {
        success: false,
        errors: resp.errors,
        message: resp.message,
      };
    }
    return {
      success: false,
      errors: {},
      message: "An unexpected error occurred",
    };
  }
}

export async function forgotPassword(_prev: ForgotPasswordState, data: ForgotPasswordPayload): Promise<ForgotPasswordState> {
  try {
    await api.post("/password_resets", data);
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
    await api.post("/email_verifications", { email, user_id: userId });
    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.post(`/email_verifications/verify?token=${token}`);
    return { success: response.data.success, message: response.data.message || "Email verified successfully" };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp.message || "An unexpected error occurred" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
  
export async function getEmailToken(token: string): Promise<MailVerification | undefined> {
  try {
    const response = await api.get(`/email_verifications/token/${token}`);
    return response.data;
  } catch {
    return undefined;
  }
}