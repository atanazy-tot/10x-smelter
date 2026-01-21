/**
 * App header with branding, user status, and navigation.
 */

import { Settings, LogOut, User, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/store";
import { CreditDisplay } from "./CreditDisplay";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <header className={cn("flex items-center justify-between p-4 border-b-2 border-neo-black bg-neo-white", className)}>
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 group">
        <span className="font-mono text-2xl font-bold uppercase tracking-wider text-neo-black group-hover:text-neo-lime transition-colors">
          SMELT
        </span>
      </a>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <CreditDisplay />

        {isAuthenticated ? (
          <>
            {/* Prompts toggle (for custom prompts sidebar) */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 border-2 border-neo-black bg-neo-white text-neo-black hover:bg-neo-black hover:text-neo-white transition-colors"
              aria-label="Toggle prompts sidebar"
              title="Custom Prompts"
            >
              <Library className="w-5 h-5" />
            </button>

            {/* Settings */}
            <a
              href="/settings"
              className="p-2 border-2 border-neo-black bg-neo-white text-neo-black hover:bg-neo-black hover:text-neo-white transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </a>

            {/* User menu / Logout */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:block font-mono text-xs text-neo-black/60 uppercase truncate max-w-[120px]">
                {user?.email}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="p-2 border-2 border-neo-black bg-neo-white text-neo-black hover:bg-neo-coral hover:text-neo-white hover:border-neo-coral transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <a
            href="/auth"
            className="flex items-center gap-2 py-2 px-4 font-mono text-sm uppercase tracking-wider border-2 border-neo-black bg-neo-lime text-neo-black hover:bg-neo-black hover:text-neo-lime transition-colors"
          >
            <User className="w-4 h-4" />
            LOGIN
          </a>
        )}
      </div>
    </header>
  );
}
