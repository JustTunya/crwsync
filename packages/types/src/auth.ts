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
}

export interface SigninPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}