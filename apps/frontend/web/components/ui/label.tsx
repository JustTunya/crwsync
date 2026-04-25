"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon } from "@hugeicons/core-free-icons";
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
        "flex items-center gap-2 text-xs sm:text-[13px] font-light tracking-wider leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        error && "flex items-center justify-center gap-2 w-full py-1.5 bg-error/10 border border-error text-error font-medium rounded-lg",
        className
      )}
      {...props}
    >
      {error && (<HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} className="size-4" />)}
      {children}
    </LabelPrimitive.Root>
  )
}

export { Label }
