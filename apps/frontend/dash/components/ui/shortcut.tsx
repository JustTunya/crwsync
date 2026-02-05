import { HugeiconsIcon } from "@hugeicons/react";
import { CommandIcon } from "@hugeicons/core-free-icons";

export function Shortcut({ chars }: { chars: string[] }) {
  return (
    <div className="inline-flex items-center justify-center gap-0.5 min-w-8 px-1 border-[1.5px] border-base-300 text-xs text-muted-foreground font-medium rounded">
      {chars.map((char, i) => (
        char === "ctrl" ? (
          <HugeiconsIcon key={i} icon={CommandIcon} strokeWidth={2} className="z-10 size-3" />
        ) : (
          <span key={i} className="z-10">{char.toUpperCase()}</span>
        )
      ))}
    </div>
  );
}