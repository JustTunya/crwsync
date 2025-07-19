import axios, { AxiosInstance } from "axios";
import { SignupState, SignupPayload, SigninState, SigninPayload } from "@crwsync/types";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  withCredentials: true,
});

export async function signup(_prev: SignupState, data: SignupPayload): Promise<SignupState> {
  try {
    await api.post("/users", data);
    return {
      success: true,
      errors: {},
      message: "Signup successful",
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