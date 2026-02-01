export type AuthMode = "login" | "register" | "reset" | "update" | "verify";

export interface AuthFormError {
  code: string;
  message: string;
}

export interface AuthFormState {
  email: string;
  password: string;
  confirmPassword: string;
  mode: AuthMode;
  isSubmitting: boolean;
  error: AuthFormError | null;
  success: string | null;
}
