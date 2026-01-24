import { useState, useCallback } from "react";
import type { AuthMode, AuthFormError, AuthFormState } from "@/components/auth/types";

const validateForm = (mode: AuthMode, email: string, password: string): AuthFormError | null => {
  if (!email.trim()) {
    return { code: "missing_email", message: "EMAIL REQUIRED" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { code: "invalid_email", message: "INVALID EMAIL FORMAT" };
  }
  if (!password) {
    return { code: "missing_password", message: "PASSWORD REQUIRED" };
  }
  // Only enforce min length for register
  if (mode === "register" && password.length < 8) {
    return { code: "weak_password", message: "PASSWORD TOO WEAK. MIN 8 CHARS" };
  }
  if (password.length > 72) {
    return { code: "password_too_long", message: "PASSWORD TOO LONG. MAX 72 CHARS" };
  }
  return null;
};

export function useAuthForm() {
  const [state, setState] = useState<AuthFormState>({
    email: "",
    password: "",
    mode: "login",
    isSubmitting: false,
    error: null,
  });

  const setEmail = useCallback((email: string) => {
    setState((prev) => ({ ...prev, email, error: null }));
  }, []);

  const setPassword = useCallback((password: string) => {
    setState((prev) => ({ ...prev, password, error: null }));
  }, []);

  const setMode = useCallback((mode: AuthMode) => {
    setState((prev) => ({ ...prev, mode, error: null }));
  }, []);

  const setError = useCallback((error: AuthFormError | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const submit = useCallback(() => {
    const { email, password, mode, isSubmitting } = state;

    // Prevent double submission
    if (isSubmitting) return;

    // Client-side validation
    const validationError = validateForm(mode, email, password);
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            const error: AuthFormError = data.error || {
              code: "unknown_error",
              message: "SOMETHING WENT WRONG. TRY AGAIN",
            };
            setState((prev) => ({ ...prev, isSubmitting: false, error }));
          });
        }
        // Success - redirect to home using location.assign to avoid react-compiler issues
        globalThis.location.assign("/");
      })
      .catch(() => {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          error: { code: "network_error", message: "NETWORK ERROR. TRY AGAIN" },
        }));
      });
  }, [state]);

  return {
    ...state,
    setEmail,
    setPassword,
    setMode,
    setError,
    submit,
  };
}
