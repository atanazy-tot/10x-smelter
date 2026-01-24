import { useAuthForm } from "@/components/hooks/useAuthForm";
import { AuthModeToggle } from "./AuthModeToggle";
import { ErrorMessage } from "./ErrorMessage";
import { AuthForm } from "./AuthForm";

export function AuthContainer() {
  const { email, password, mode, isSubmitting, error, setEmail, setPassword, setMode, submit } = useAuthForm();

  return (
    <div className="flex flex-col gap-6">
      <AuthModeToggle mode={mode} onModeChange={setMode} disabled={isSubmitting} />

      <ErrorMessage error={error} />

      <AuthForm
        email={email}
        password={password}
        mode={mode}
        isSubmitting={isSubmitting}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
      />

      <p className="text-xs font-mono text-foreground/40 text-center uppercase">
        {mode === "login" ? "DON'T HAVE AN ACCOUNT? SWITCH TO REGISTER" : "ALREADY HAVE AN ACCOUNT? SWITCH TO LOGIN"}
      </p>
    </div>
  );
}
