import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z.string().min(1, "EMAIL REQUIRED").email("INVALID EMAIL FORMAT"),
  password: z.string().min(8, "PASSWORD TOO WEAK. MIN 8 CHARS").max(72, "PASSWORD TOO LONG. MAX 72 CHARS"),
});

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
