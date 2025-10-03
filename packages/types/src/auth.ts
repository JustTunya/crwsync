export interface SignupState {
  success?: boolean;
  errors?: {
    email?: string;
    username?: string;
    firstname?: string;
    lastname?: string;
    gender?: string;
    birthdate?: string;
    password?: string;
    confpassword?: string;
  };
  message?: string;
  userId?: string;
}

export interface SignupPayload {
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  gender: string;
  birthdate: string;
  password: string;
}

export interface SigninState {
  success?: boolean;
  errors?: {
    identifier?: string;
    password?: string;
  };
  message?: string;
  userId?: string;
}

export interface SigninPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordState {
  success?: boolean;
  errors?: {
    email?: string;
  };
  message?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordState {
  success?: boolean;
  errors?: {
    password?: string;
    token?: string;
  };
  message?: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
}