import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AuthMode } from "./types";

interface AuthFormProps {
  email: string;
  password: string;
  mode: AuthMode;
  isSubmitting: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
}

export function AuthForm({
  email,
  password,
  mode,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AuthFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const submitText = isSubmitting ? "PROCESSING..." : mode === "login" ? "LOGIN" : "CREATE ACCOUNT";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-foreground/60">
          EMAIL
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="YOUR@EMAIL.COM"
          disabled={isSubmitting}
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-foreground/60">
          PASSWORD
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={mode === "register" ? "MIN 8 CHARACTERS" : "YOUR PASSWORD"}
          disabled={isSubmitting}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
        {submitText}
      </Button>
    </form>
  );
}
