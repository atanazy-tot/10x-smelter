import { HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiKeyInput } from "./ApiKeyInput";

interface ApiKeyFormProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  onSubmit: () => void;
  isValidating: boolean;
  hasError: boolean;
}

export function ApiKeyForm({
  inputValue,
  onInputChange,
  showKey,
  onToggleShowKey,
  onSubmit,
  isValidating,
  hasError,
}: ApiKeyFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="api-key" className="font-mono uppercase">
            OPENROUTER API KEY
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs uppercase">GET YOUR KEY AT OPENROUTER.AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ApiKeyInput
          value={inputValue}
          onChange={onInputChange}
          showKey={showKey}
          onToggleShowKey={onToggleShowKey}
          hasError={hasError}
          disabled={isValidating}
        />
      </div>
      <Button type="submit" disabled={!inputValue.trim() || isValidating} className="w-full">
        {isValidating ? (
          <>
            <span className="animate-spin">@</span>
            VALIDATING...
          </>
        ) : (
          "VALIDATE"
        )}
      </Button>
    </form>
  );
}
