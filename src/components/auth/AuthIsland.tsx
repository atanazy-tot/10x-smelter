import { useEffect, useState } from "react";
import { AuthContainer } from "./AuthContainer";
import { apiFetch } from "@/lib/utils/api-client";
import { clearTokens } from "@/lib/utils/token-storage";

export function AuthIsland() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiFetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session.authenticated) {
            window.location.href = "/";
            return;
          }
        }
        // Not authenticated - clear any stale tokens
        clearTokens();
      } catch {
        // Ignore errors - show auth form
        clearTokens();
      }
      setIsReady(true);
    };
    checkSession();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="font-mono text-sm uppercase text-foreground/60">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b-2 border-border">
        <a
          href="/"
          className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground hover:text-main transition-colors"
        >
          SMELT
        </a>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background border-2 border-border shadow-shadow p-6">
          <AuthContainer />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t-2 border-border text-center">
        <span className="font-mono text-xs uppercase text-foreground/40">SMELT - AUDIO TO MARKDOWN</span>
      </footer>
    </div>
  );
}
