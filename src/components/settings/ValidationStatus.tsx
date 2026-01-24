import { CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { ApiKeyValidationResult, ApiKeyError } from "./types";

interface ValidationStatusProps {
  validationResult: ApiKeyValidationResult | null;
  error: ApiKeyError | null;
}

export function ValidationStatus({ validationResult, error }: ValidationStatusProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="size-4" />
        <AlertTitle className="font-mono uppercase">{error.code.toUpperCase()}</AlertTitle>
        <AlertDescription className="font-mono text-xs uppercase">{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (validationResult?.success && validationResult.status === "valid") {
    return (
      <Alert className="mt-4 bg-neo-mint">
        <CheckCircle2 className="size-4" />
        <AlertTitle className="font-mono uppercase">SUCCESS</AlertTitle>
        <AlertDescription className="font-mono text-xs uppercase">{validationResult.message}</AlertDescription>
      </Alert>
    );
  }

  return null;
}
