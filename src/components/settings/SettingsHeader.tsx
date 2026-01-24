import { ArrowLeft } from "lucide-react";

export function SettingsHeader() {
  return (
    <header className="p-4 border-b-2 border-border">
      <div className="flex items-center gap-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-foreground hover:text-main transition-colors"
        >
          <ArrowLeft className="size-4" />
          BACK
        </a>
        <span className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground">SMELT</span>
      </div>
    </header>
  );
}
