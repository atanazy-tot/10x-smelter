import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  hasError: boolean;
  disabled?: boolean;
}

export function ApiKeyInput({ value, onChange, showKey, onToggleShowKey, hasError, disabled }: ApiKeyInputProps) {
  return (
    <div className="relative">
      <Input
        type={showKey ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sk-or-v1-..."
        disabled={disabled}
        className={hasError ? "border-neo-coral" : ""}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-10 w-10"
        onClick={onToggleShowKey}
        disabled={disabled}
      >
        {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
