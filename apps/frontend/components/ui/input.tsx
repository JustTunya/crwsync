import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon, CheckmarkCircle02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  className?: string;
  visible?: boolean;
  setVisible?: () => void;
  validation?: boolean;
  error?: boolean;
}

function Input({ className, type, visible, setVisible, validation, error, ...props }: InputProps) {
  const hasVisibilityIcon = type === "password" && visible !== undefined && setVisible;
  const hasValidationIcon = validation !== undefined;

  const iconSize = 18;
  const iconWidth =1.5;

  return (
    <div className={cn(
      "w-full flex bg-input/50 backdrop-blur-xl border shadow-md/5 rounded-md transition-all", 
      "focus-within:ring-3 focus-within:ring-primary/50 focus-within:border-primary",
      error ? "border-error" : "border-border",
      className
      )}>
      <input
        type={type === "password" && visible ? "text" : type}
        data-slot="input"
        className={cn(
          "flex h-9 w-full px-3 py-1 text-xs sm:text-sm rounded-md",
          "placeholder:text-placeholder selection:bg-primary/25 outline-none",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        )}
        {...props}
      />
      <div className={cn("h-9 flex justify-center items-center", (hasVisibilityIcon || hasValidationIcon) && "px-3")}>
        {hasVisibilityIcon && <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={iconSize} strokeWidth={iconWidth} onClick={setVisible} className="cursor-pointer text-primary" />}
        {hasValidationIcon && <HugeiconsIcon icon={validation ? CheckmarkCircle02Icon : CancelCircleIcon} size={iconSize} strokeWidth={iconWidth} className={cn(validation ? "text-success" : "text-error")} />}
      </div>
    </div>
  )
}

export { Input }
