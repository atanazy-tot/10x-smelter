/**
 * Coral background error message with contextual CTAs.
 */

import { AlertTriangle, RefreshCw, UserPlus, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProcessingStore, useInputStore } from "@/store";
import type { SmeltErrorCode } from "@/types";

interface ErrorDisplayProps {
  className?: string;
}

interface ErrorConfig {
  message: string;
  cta?: {
    label: string;
    icon: typeof AlertTriangle;
    action: "signup" | "settings" | "retry";
    href?: string;
  };
}

function getErrorConfig(code: SmeltErrorCode | string, message: string): ErrorConfig {
  switch (code) {
    case "daily_limit":
      return {
        message: "DAILY LIMIT HIT. SIGN UP FOR 5 SMELTS PER WEEK",
        cta: {
          label: "SIGN UP",
          icon: UserPlus,
          action: "signup",
          href: "/auth",
        },
      };
    case "weekly_limit":
      return {
        message: "WEEKLY LIMIT REACHED. ADD YOUR OWN API KEY FOR UNLIMITED ACCESS",
        cta: {
          label: "ADD API KEY",
          icon: Key,
          action: "settings",
          href: "/settings",
        },
      };
    case "connection_lost":
      return {
        message: "CONNECTION LOST. CHECK YOUR INTERNET AND TRY AGAIN",
        cta: {
          label: "RETRY",
          icon: RefreshCw,
          action: "retry",
        },
      };
    case "file_too_large":
      return { message: "FILE TOO CHUNKY. MAX 25MB" };
    case "invalid_format":
      return { message: "CAN'T READ THAT. TRY .MP3 .WAV .M4A" };
    case "corrupted_file":
      return { message: "CORRUPTED FILE. TRY A DIFFERENT ONE" };
    case "transcription_failed":
      return {
        message: "TRANSCRIPTION FAILED. TRY AGAIN",
        cta: {
          label: "RETRY",
          icon: RefreshCw,
          action: "retry",
        },
      };
    case "synthesis_failed":
      return {
        message: "SYNTHESIS FAILED. TRY AGAIN",
        cta: {
          label: "RETRY",
          icon: RefreshCw,
          action: "retry",
        },
      };
    case "api_rate_limited":
      return { message: "RATE LIMITED. WAIT A MOMENT AND TRY AGAIN" };
    default:
      return { message: message || "SOMETHING WENT WRONG. TRY AGAIN" };
  }
}

export function ErrorDisplay({ className }: ErrorDisplayProps) {
  const status = useProcessingStore((state) => state.status);
  const error = useProcessingStore((state) => state.error);
  const reset = useProcessingStore((state) => state.reset);
  const clearAll = useInputStore((state) => state.clearAll);

  // Don't show if not failed or no error
  if (status !== "failed" || !error) {
    return null;
  }

  const config = getErrorConfig(error.code, error.message);
  const Icon = config.cta?.icon || AlertTriangle;

  const handleCtaClick = () => {
    if (config.cta?.action === "retry") {
      reset();
      // Don't clear inputs, let user retry with same input
    } else if (config.cta?.href) {
      window.location.href = config.cta.href;
    }
  };

  const handleDismiss = () => {
    reset();
    clearAll();
  };

  return (
    <div className={cn("flex flex-col gap-4 p-6 bg-neo-coral border-2 border-border", className)}>
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-background shrink-0 mt-1" />
        <div className="flex-1">
          <p className="font-mono text-background uppercase tracking-wider">{config.message}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {config.cta && (
          <button
            type="button"
            onClick={handleCtaClick}
            className="flex items-center gap-2 py-2 px-4 bg-background text-foreground font-mono text-sm uppercase tracking-wider border-2 border-border hover:bg-foreground hover:text-background transition-colors"
          >
            <Icon className="w-4 h-4" />
            {config.cta.label}
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="py-2 px-4 bg-transparent text-background font-mono text-sm uppercase tracking-wider border-2 border-background hover:bg-background hover:text-neo-coral transition-colors"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}
