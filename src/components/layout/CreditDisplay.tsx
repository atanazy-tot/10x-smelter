/**
 * Shows remaining credits based on user type.
 */

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

interface CreditDisplayProps {
  className?: string;
}

export function CreditDisplay({ className }: CreditDisplayProps) {
  const usage = useAuthStore((state) => state.usage);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <span className={cn("font-mono text-xs uppercase tracking-wider text-neo-black/40", className)}>LOADING...</span>
    );
  }

  if (!usage) {
    return null;
  }

  let text: string;
  let colorClass: string;

  switch (usage.type) {
    case "anonymous": {
      const remaining = usage.daily_limit - usage.smelts_used_today;
      text = `${remaining}/${usage.daily_limit} DAILY SMELT`;
      colorClass = remaining > 0 ? "text-neo-lime" : "text-neo-coral";
      break;
    }
    case "authenticated": {
      const remaining = usage.credits_remaining;
      const max = usage.weekly_credits_max;
      text = `${remaining}/${max} LEFT THIS WEEK`;
      colorClass = remaining > 0 ? "text-neo-lime" : "text-neo-coral";
      break;
    }
    case "unlimited": {
      text = "UNLIMITED";
      colorClass = "text-neo-mint";
      break;
    }
    default:
      return null;
  }

  return (
    <span
      className={cn(
        "font-mono text-xs uppercase tracking-wider px-2 py-1 border-2 border-neo-black bg-neo-black",
        colorClass,
        className
      )}
    >
      {text}
    </span>
  );
}
