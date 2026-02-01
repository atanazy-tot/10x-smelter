import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "./ErrorMessage";
import { SuccessMessage } from "./SuccessMessage";
import type { AuthFormError } from "./types";

export function ResetPasswordIsland() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthFormError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError({ code: "missing_email", message: "EMAIL REQUIRED" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError({ code: "invalid_email", message: "INVALID EMAIL FORMAT" });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || { code: "unknown_error", message: "SOMETHING WENT WRONG. TRY AGAIN" });
      } else {
        setSuccess("IF EMAIL EXISTS, RESET LINK SENT. CHECK YOUR INBOX");
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
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider mb-2">RESET PASSWORD</h1>
              <p className="font-mono text-sm text-foreground/60 uppercase">ENTER YOUR EMAIL TO RECEIVE A RESET LINK</p>
            </div>

            <ErrorMessage error={error} />
            <SuccessMessage message={success} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-foreground/60">
                  EMAIL
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder="YOUR@EMAIL.COM"
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
                {isSubmitting ? "SENDING..." : "SEND RESET LINK"}
              </Button>
            </form>

            <div className="flex flex-col gap-2 text-center">
              <a href="/auth" className="text-xs font-mono text-main hover:underline uppercase">
                BACK TO LOGIN
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t-2 border-border text-center">
        <span className="font-mono text-xs uppercase text-foreground/40">SMELT - AUDIO TO MARKDOWN</span>
      </footer>
    </div>
  );
}
