import { Key, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApiKeyStatus } from "@/types";

interface ApiKeyStatusBadgeProps {
  status: ApiKeyStatus | null;
  hasKey: boolean;
}

export function ApiKeyStatusBadge({ status, hasKey }: ApiKeyStatusBadgeProps) {
  if (!hasKey || status === "none") {
    return (
      <Badge variant="neutral" className="font-mono text-xs uppercase">
        <Key className="size-3" />
        NO KEY
      </Badge>
    );
  }

  if (status === "valid") {
    return (
      <Badge className="bg-neo-mint text-foreground font-mono text-xs uppercase">
        <Check className="size-3" />
        VALID
      </Badge>
    );
  }

  return (
    <Badge className="bg-neo-coral text-foreground font-mono text-xs uppercase">
      <X className="size-3" />
      INVALID
    </Badge>
  );
}
