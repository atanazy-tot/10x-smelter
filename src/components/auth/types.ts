export type AuthMode = "login" | "register";

export interface AuthFormError {
  code: string;
  message: string;
}

export interface AuthFormState {
  email: string;
  password: string;
  mode: AuthMode;
  isSubmitting: boolean;
  error: AuthFormError | null;
}
