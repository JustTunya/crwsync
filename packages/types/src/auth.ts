export interface SignupState {
  success?: boolean;
  errors?: {
    email?: string;
    username?: string;
    firstname?: string;
    lastname?: string;
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
    newPassword?: string;
    token?: string;
  };
  message?: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
  role: string;
  rver: number;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
}