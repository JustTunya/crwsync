"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils"

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  className?: string;
  error?: boolean;
}

function Label({
  className,
  error = false,
  children,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs sm:text-sm text-shadow-xs text-shadow-foreground/10 leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        error && "text-error text-xs",
        className
      )}
      {...props}
    >
      {error && (<HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} />)}
      {children}
    </LabelPrimitive.Root>
  )
}

export { Label }
