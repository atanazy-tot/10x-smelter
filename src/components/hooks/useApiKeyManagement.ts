import { useState, useCallback, useEffect } from "react";
import type { ApiKeyStatusDTO, ApiKeyValidationDTO } from "@/types";
import type { ApiKeyValidationResult, ApiKeyError } from "@/components/settings/types";
import { apiFetch } from "@/lib/utils/api-client";
import { useAuthStore } from "@/store/auth";

export interface ApiKeyManagementState {
  keyStatus: ApiKeyStatusDTO | null;
  inputValue: string;
  showKey: boolean;
  isLoading: boolean;
  isValidating: boolean;
  isRemoving: boolean;
  validationResult: ApiKeyValidationResult | null;
  error: ApiKeyError | null;
}

export function useApiKeyManagement() {
  const [state, setState] = useState<ApiKeyManagementState>({
    keyStatus: null,
    inputValue: "",
    showKey: false,
    isLoading: true,
    isValidating: false,
    isRemoving: false,
    validationResult: null,
    error: null,
  });

  const setInputValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, inputValue: value, error: null, validationResult: null }));
  }, []);

  const toggleShowKey = useCallback(() => {
    setState((prev) => ({ ...prev, showKey: !prev.showKey }));
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/api/api-keys/status");
      if (response.ok) {
        const status: ApiKeyStatusDTO = await response.json();
        setState((prev) => ({ ...prev, keyStatus: status, isLoading: false }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: { code: "fetch_failed", message: "FAILED TO LOAD API KEY STATUS" },
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: { code: "network_error", message: "NETWORK ERROR" },
      }));
    }
  }, []);

  const validateKey = useCallback(async () => {
    const { inputValue, isValidating } = state;

    if (isValidating || !inputValue.trim()) return;

    setState((prev) => ({ ...prev, isValidating: true, error: null, validationResult: null }));

    try {
      const response = await apiFetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: inputValue }),
      });

      if (response.ok) {
        const data: ApiKeyValidationDTO = await response.json();
        setState((prev) => ({
          ...prev,
          isValidating: false,
          inputValue: "",
          keyStatus: {
            has_key: true,
            status: data.status,
            validated_at: data.validated_at,
          },
          validationResult: {
            success: true,
            status: data.status,
            message: data.message,
            validatedAt: data.validated_at,
          },
        }));
        // Refresh usage to update header
        useAuthStore.getState().refreshUsage();
      } else {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          isValidating: false,
          error: {
            code: errorData.error?.code || "validation_failed",
            message: errorData.error?.message || "VALIDATION FAILED",
          },
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isValidating: false,
        error: { code: "network_error", message: "NETWORK ERROR" },
      }));
    }
  }, [state]);

  const removeKey = useCallback(async () => {
    const { isRemoving } = state;

    if (isRemoving) return;

    setState((prev) => ({ ...prev, isRemoving: true, error: null, validationResult: null }));

    try {
      const response = await apiFetch("/api/api-keys", {
        method: "DELETE",
      });

      if (response.ok) {
        await response.json(); // consume response body
        setState((prev) => ({
          ...prev,
          isRemoving: false,
          keyStatus: {
            has_key: false,
            status: "none",
            validated_at: null,
          },
          validationResult: {
            success: true,
            status: "none",
            message: "API KEY REMOVED",
            validatedAt: null,
          },
        }));
        // Refresh usage to update header
        useAuthStore.getState().refreshUsage();
      } else {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          isRemoving: false,
          error: {
            code: errorData.error?.code || "remove_failed",
            message: errorData.error?.message || "FAILED TO REMOVE KEY",
          },
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isRemoving: false,
        error: { code: "network_error", message: "NETWORK ERROR" },
      }));
    }
  }, [state]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    setInputValue,
    toggleShowKey,
    validateKey,
    removeKey,
    refetch: fetchStatus,
  };
}
