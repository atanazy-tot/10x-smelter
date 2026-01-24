import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RemoveKeyButtonProps {
  isRemoving: boolean;
  onRemove: () => void;
}

export function RemoveKeyButton({ isRemoving, onRemove }: RemoveKeyButtonProps) {
  return (
    <Button variant="destructive" onClick={onRemove} disabled={isRemoving} className="mt-4">
      {isRemoving ? <span className="animate-spin">@</span> : <Trash2 className="size-4" />}
      {isRemoving ? "REMOVING..." : "REMOVE KEY"}
    </Button>
  );
}
