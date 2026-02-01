import { CheckCircle } from "lucide-react";

interface SuccessMessageProps {
  message: string | null;
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div className="bg-main/20 border-2 border-main p-3 flex items-center gap-2">
      <CheckCircle className="size-4 text-main shrink-0" />
      <span className="font-mono text-sm text-main uppercase">{message}</span>
    </div>
  );
}
