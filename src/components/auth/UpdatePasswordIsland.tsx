import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "./ErrorMessage";
import { SuccessMessage } from "./SuccessMessage";
import type { AuthFormError } from "./types";

export function UpdatePasswordIsland() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthFormError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError({ code: "missing_password", message: "PASSWORD REQUIRED" });
      return;
    }

    if (password.length < 8) {
      setError({ code: "weak_password", message: "PASSWORD TOO WEAK. MIN 8 CHARS" });
      return;
    }

    if (password.length > 72) {
      setError({ code: "password_too_long", message: "PASSWORD TOO LONG. MAX 72 CHARS" });
      return;
    }

    if (password !== confirmPassword) {
      setError({ code: "password_mismatch", message: "PASSWORDS DON'T MATCH" });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || { code: "unknown_error", message: "SOMETHING WENT WRONG. TRY AGAIN" });
      } else {
        setSuccess("PASSWORD UPDATED");
        // Redirect to home after brief delay
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch {
      setError({ code: "network_error", message: "NETWORK ERROR. TRY AGAIN" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b-2 border-border">
        <a
          href="/"
          className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground hover:text-main transition-colors"
        >
          SMELT
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background border-2 border-border shadow-shadow p-6">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider mb-2">UPDATE PASSWORD</h1>
              <p className="font-mono text-sm text-foreground/60 uppercase">CHOOSE A NEW STRONG PASSWORD</p>
            </div>

            <ErrorMessage error={error} />
            <SuccessMessage message={success} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-foreground/60">
                  NEW PASSWORD
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder="MIN 8 CHARACTERS"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirmPassword"
                  className="font-mono text-xs uppercase tracking-wider text-foreground/60"
                >
                  CONFIRM PASSWORD
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder="REPEAT PASSWORD"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
                {isSubmitting ? "UPDATING..." : "UPDATE PASSWORD"}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t-2 border-border text-center">
        <span className="font-mono text-xs uppercase text-foreground/40">SMELT - AUDIO TO MARKDOWN</span>
      </footer>
    </div>
  );
}
