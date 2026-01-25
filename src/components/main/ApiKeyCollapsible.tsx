/**
 * Collapsible API key management section.
 * Shows status badge in trigger, form and controls in content.
 * Only renders for authenticated users.
 */

import { ChevronDown, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useApiKeyManagement } from "@/components/hooks/useApiKeyManagement";
import { ApiKeyStatusBadge } from "@/components/settings/ApiKeyStatusBadge";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ValidationStatus } from "@/components/settings/ValidationStatus";
import { RemoveKeyButton } from "@/components/settings/RemoveKeyButton";

interface ApiKeyCollapsibleProps {
  className?: string;
}

export function ApiKeyCollapsible({ className }: ApiKeyCollapsibleProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    keyStatus,
    inputValue,
    showKey,
    isLoading,
    isValidating,
    isRemoving,
    validationResult,
    error,
    setInputValue,
    toggleShowKey,
    validateKey,
    removeKey,
  } = useApiKeyManagement();

  // Don't render for anonymous users
  if (!isAuthenticated) {
    return null;
  }

  const hasKey = keyStatus?.has_key ?? false;
  const keyIsValid = keyStatus?.status === "valid";
  const showForm = !hasKey || !keyIsValid;

  return (
    <Card className={cn("w-full", className)}>
      <Collapsible>
        {/* Trigger with status badge */}
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-mono text-sm uppercase tracking-wider hover:bg-foreground/5 transition-colors">
          <span className="flex items-center gap-3">
            <Key className="w-4 h-4" />
            API KEY SETTINGS
          </span>
          <span className="flex items-center gap-3">
            {!isLoading && <ApiKeyStatusBadge status={keyStatus?.status ?? null} hasKey={hasKey} />}
            <ChevronDown className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </span>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 border-t border-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <span className="font-mono text-sm uppercase text-foreground/60">LOADING...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pt-4">
                {/* Description */}
                <p className="font-mono text-xs text-foreground/60 uppercase">
                  {hasKey && keyIsValid
                    ? "YOUR OPENROUTER API KEY IS CONFIGURED. YOU HAVE UNLIMITED PROCESSING."
                    : "ADD YOUR OPENROUTER API KEY FOR UNLIMITED PROCESSING."}
                </p>

                {/* Form */}
                {showForm && (
                  <ApiKeyForm
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    showKey={showKey}
                    onToggleShowKey={toggleShowKey}
                    onSubmit={validateKey}
                    isValidating={isValidating}
                    hasError={!!error}
                  />
                )}

                {/* Validation status */}
                <ValidationStatus validationResult={validationResult} error={error} />

                {/* Remove button */}
                {hasKey && keyIsValid && <RemoveKeyButton isRemoving={isRemoving} onRemove={removeKey} />}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
