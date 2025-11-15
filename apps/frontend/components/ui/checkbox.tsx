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
        "size-4 border-1 rounded-sm shadow-sm/5 flex items-center justify-center cursor-pointer transition-colors backdrop-blur-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
        checked ? "bg-primary/40 border-primary" : "bg-base-input/50 border-border"
      )}
    >
      { checked && (<HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} className="text-primary" />) }
    </div>
  );
}
