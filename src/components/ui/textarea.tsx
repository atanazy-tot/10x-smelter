import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[120px] w-full bg-background text-foreground font-mono text-sm border-2 border-border p-4 placeholder:text-foreground/40 placeholder:uppercase focus:outline-none focus:ring-0 resize-none",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
