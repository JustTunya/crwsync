"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ id, checked, onChange }: CheckboxProps) {
  const [check, setCheck] = useState(checked);

  const toggle = () => {
    const next = !check;
    setCheck(next);
    onChange?.(next);
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div 
      id={id}
      role="checkbox"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={onKeyDown}
      aria-checked={check}
      aria-labelledby={id}
      aria-label="Checkbox"
      className={cn(
        "size-4 border rounded-sm shadow-md/10 flex items-center justify-center cursor-pointer transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20",
        checked ? "bg-accent/50 border-accent" : "bg-base-100/50 hover:bg-base-100/75 border-base-100"
      )}
    >
      { checked && (<HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} className="text-accent" />) }
    </div>
  );
}
