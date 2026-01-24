import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useApiKeyManagement } from "@/components/hooks/useApiKeyManagement";
import { ApiKeyStatusBadge } from "./ApiKeyStatusBadge";
import { ApiKeyForm } from "./ApiKeyForm";
import { ValidationStatus } from "./ValidationStatus";
import { RemoveKeyButton } from "./RemoveKeyButton";

export function ApiKeySection() {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="font-mono text-sm uppercase text-foreground/60">LOADING...</span>
      </div>
    );
  }

  const hasKey = keyStatus?.has_key ?? false;
  const keyIsValid = keyStatus?.status === "valid";
  const showForm = !hasKey || !keyIsValid;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>API KEY</CardTitle>
          <ApiKeyStatusBadge status={keyStatus?.status ?? null} hasKey={hasKey} />
        </div>
        <CardDescription>
          {hasKey && keyIsValid
            ? "YOUR OPENROUTER API KEY IS CONFIGURED. YOU HAVE UNLIMITED PROCESSING."
            : "ADD YOUR OPENROUTER API KEY FOR UNLIMITED PROCESSING."}
        </CardDescription>
      </CardHeader>
      <CardContent>
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

        <ValidationStatus validationResult={validationResult} error={error} />

        {hasKey && keyIsValid && <RemoveKeyButton isRemoving={isRemoving} onRemove={removeKey} />}
      </CardContent>
    </Card>
  );
}
