import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { apiFetch } from "@/lib/utils/api-client";
import { clearTokens } from "@/lib/utils/token-storage";
import { SettingsHeader } from "./SettingsHeader";
import { ApiKeySection } from "./ApiKeySection";

export function SettingsIsland() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiFetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session.authenticated) {
            setIsReady(true);
            return;
          }
        }
        // Not authenticated - redirect to auth page
        clearTokens();
        window.location.href = "/auth";
      } catch {
        // Error - redirect to auth page
        clearTokens();
        window.location.href = "/auth";
      }
    };
    checkSession();
  }, []);

  // Expose toast for child components
  useEffect(() => {
    // Make toast available globally for this page
    (window as unknown as { showToast: typeof toast }).showToast = toast;
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
      <SettingsHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        <ApiKeySection />
      </main>

      <footer className="p-4 border-t-2 border-border text-center">
        <span className="font-mono text-xs uppercase text-foreground/40">SMELT - SETTINGS</span>
      </footer>

      <Toaster position="bottom-right" />
    </div>
  );
}
