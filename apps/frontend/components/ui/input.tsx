import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon, CheckmarkCircle02Icon, CancelCircleIcon, Calendar04Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  className?: string;
  visible?: boolean;
  setVisible?: () => void;
  validation?: boolean;
}

function Input({ className, type, visible, setVisible, validation, ...props }: InputProps) {
  const hasVisibilityIcon = type === "password" && visible !== undefined && setVisible;
  const hasValidationIcon = validation !== undefined;

  const iconSize = 18;
  const iconWidth = 1;

  return (
    <div className="w-full flex justify-items-center bg-white/60 backdrop-blur-md border border-white/50 shadow-lg/5 rounded-md">
      <input
        type={type === "password" && visible ? "text" : type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:text-black selection:bg-gray-200 dark:bg-input/30 flex h-9 w-full min-w-0 px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          //"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
      <div className={cn("h-9 flex justify-center items-center", (hasVisibilityIcon || hasValidationIcon) && "pr-3")}>
        {hasVisibilityIcon && <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={iconSize} strokeWidth={iconWidth} onClick={setVisible} className="cursor-pointer" />}
        {hasValidationIcon && <HugeiconsIcon icon={validation ? CheckmarkCircle02Icon : CancelCircleIcon} size={iconSize} strokeWidth={iconWidth} />}
      </div>
      {/* <div className="absolute inset-0 rounded-md shadow-[inset_0_4px_8px_0_rgba(255,255,255,0.4),inset_0_-1px_6px_-1px_rgba(0,0,0,0.1)]" /> */}
    </div>
  )
}

export { Input }
