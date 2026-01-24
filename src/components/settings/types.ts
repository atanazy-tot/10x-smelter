import type { ApiKeyStatus } from "@/types";

export interface ApiKeyValidationResult {
  success: boolean;
  status: ApiKeyStatus;
  message: string;
  validatedAt: string | null;
}

export interface ApiKeyError {
  code: string;
  message: string;
}
