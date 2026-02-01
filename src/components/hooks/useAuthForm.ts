import { useState, useCallback } from "react";
import type { AuthMode, AuthFormError, AuthFormState } from "@/components/auth/types";
import type { RegisterResponseDTO } from "@/types";

const validateForm = (
  mode: AuthMode,
  email: string,
  password: string,
  confirmPassword: string
): AuthFormError | null => {
  // Email validation for login, register, reset, verify
  if (mode !== "update") {
    if (!email.trim()) {
      return { code: "missing_email", message: "EMAIL REQUIRED" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { code: "invalid_email", message: "INVALID EMAIL FORMAT" };
    }
  }

  // Password validation for login, register, update
  if (mode === "login" || mode === "register" || mode === "update") {
    if (!password) {
      return { code: "missing_password", message: "PASSWORD REQUIRED" };
    }
    // Enforce min length for register and update
    if ((mode === "register" || mode === "update") && password.length < 8) {
      return { code: "weak_password", message: "PASSWORD TOO WEAK. MIN 8 CHARS" };
    }
    if (password.length > 72) {
      return { code: "password_too_long", message: "PASSWORD TOO LONG. MAX 72 CHARS" };
    }
  }

  // Confirm password for update mode
  if (mode === "update" && password !== confirmPassword) {
    return { code: "password_mismatch", message: "PASSWORDS DON'T MATCH" };
  }

  return null;
};

const getEndpoint = (mode: AuthMode): string => {
  switch (mode) {
    case "login":
      return "/api/auth/login";
    case "register":
      return "/api/auth/register";
    case "reset":
      return "/api/auth/reset-password";
    case "update":
      return "/api/auth/update-password";
    case "verify":
      return "/api/auth/resend-verification";
    default:
      return "/api/auth/login";
  }
};

const getSuccessMessage = (mode: AuthMode): string => {
  switch (mode) {
    case "register":
      return "CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT";
    case "reset":
      return "IF EMAIL EXISTS, RESET LINK SENT. CHECK YOUR INBOX";
    case "update":
      return "PASSWORD UPDATED";
    case "verify":
      return "IF EMAIL EXISTS, VERIFICATION LINK SENT. CHECK YOUR INBOX";
    default:
      return "";
  }
};

export function useAuthForm(initialMode: AuthMode = "login") {
  const [state, setState] = useState<AuthFormState>({
    email: "",
    password: "",
    confirmPassword: "",
    mode: initialMode,
    isSubmitting: false,
    error: null,
    success: null,
  });

  const setEmail = useCallback((email: string) => {
    setState((prev) => ({ ...prev, email, error: null, success: null }));
  }, []);

  const setPassword = useCallback((password: string) => {
    setState((prev) => ({ ...prev, password, error: null, success: null }));
  }, []);

  const setConfirmPassword = useCallback((confirmPassword: string) => {
    setState((prev) => ({ ...prev, confirmPassword, error: null, success: null }));
  }, []);

  const setMode = useCallback((mode: AuthMode) => {
    setState((prev) => ({ ...prev, mode, error: null, success: null }));
  }, []);

  const setError = useCallback((error: AuthFormError | null) => {
    setState((prev) => ({ ...prev, error, success: null }));
  }, []);

  const setSuccess = useCallback((success: string | null) => {
    setState((prev) => ({ ...prev, success, error: null }));
  }, []);

  const submit = useCallback(() => {
    const { email, password, confirmPassword, mode, isSubmitting } = state;

    // Prevent double submission
    if (isSubmitting) return;

    // Client-side validation
    const validationError = validateForm(mode, email, password, confirmPassword);
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null, success: null }));

    const endpoint = getEndpoint(mode);
    const body =
      mode === "update" ? { password } : mode === "reset" || mode === "verify" ? { email } : { email, password };

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin", // Include cookies
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          const error: AuthFormError = data.error || {
            code: "unknown_error",
            message: "SOMETHING WENT WRONG. TRY AGAIN",
          };
          setState((prev) => ({ ...prev, isSubmitting: false, error }));
          return;
        }

        // Handle success based on mode
        if (mode === "login") {
          // Login - session cookie is set, redirect to home
          globalThis.location.assign("/");
        } else if (mode === "register") {
          // Register - show success message about email verification
          const data: RegisterResponseDTO = await response.json();
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            success: data.message || getSuccessMessage(mode),
          }));
        } else if (mode === "update") {
          // Password update - redirect to home
          globalThis.location.assign("/");
        } else {
          // Reset or verify - show success message
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            success: getSuccessMessage(mode),
          }));
        }
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
    setConfirmPassword,
    setMode,
    setError,
    setSuccess,
    submit,
  };
}
