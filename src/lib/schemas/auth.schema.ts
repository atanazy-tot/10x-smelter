import { z } from "zod";

// Email validation (reusable)
const emailField = z.string().min(1, "EMAIL REQUIRED").email("INVALID EMAIL FORMAT");

// Password validation (reusable)
const passwordField = z.string().min(8, "PASSWORD TOO WEAK. MIN 8 CHARS").max(72, "PASSWORD TOO LONG. MAX 72 CHARS");

/**
 * Schema for login requests.
 * Password validation is lenient - just check it exists.
 */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "PASSWORD REQUIRED"),
});

/**
 * Schema for registration requests.
 * Password must be 8-72 characters (Supabase requirement).
 */
export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
});

/**
 * Schema for password reset requests.
 * Only email is required.
 */
export const resetPasswordSchema = z.object({
  email: emailField,
});

/**
 * Schema for updating password (after reset or in settings).
 * Password must meet strength requirements.
 */
export const updatePasswordSchema = z.object({
  password: passwordField,
});

/**
 * Schema for resending verification email.
 * Only email is required.
 */
export const resendVerificationSchema = z.object({
  email: emailField,
});

// Legacy schema for backwards compatibility
export const authCredentialsSchema = registerSchema;

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
