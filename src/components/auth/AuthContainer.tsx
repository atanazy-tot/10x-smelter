import { useAuthForm } from "@/components/hooks/useAuthForm";
import { AuthModeToggle } from "./AuthModeToggle";
import { ErrorMessage } from "./ErrorMessage";
import { SuccessMessage } from "./SuccessMessage";
import { AuthForm } from "./AuthForm";

export function AuthContainer() {
  const { email, password, mode, isSubmitting, error, success, setEmail, setPassword, setMode, submit } = useAuthForm();

  return (
    <div className="flex flex-col gap-6">
      <AuthModeToggle mode={mode} onModeChange={setMode} disabled={isSubmitting} />

      <ErrorMessage error={error} />
      <SuccessMessage message={success} />

      <AuthForm
        email={email}
        password={password}
        mode={mode}
        isSubmitting={isSubmitting}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
      />

      <div className="flex flex-col gap-2 text-center">
        <p className="text-xs font-mono text-foreground/40 uppercase">
          {mode === "login" ? "DON'T HAVE AN ACCOUNT? SWITCH TO REGISTER" : "ALREADY HAVE AN ACCOUNT? SWITCH TO LOGIN"}
        </p>
        {mode === "login" && (
          <a href="/auth/reset-password" className="text-xs font-mono text-main hover:underline uppercase">
            FORGOT YOUR PASSWORD?
          </a>
        )}
      </div>
    </div>
  );
}
