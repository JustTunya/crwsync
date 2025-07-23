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
  const iconWidth = 1.5;

  return (
    <div className={cn(
      "w-full flex bg-base-100/50 backdrop-blur-md border border-base-100 shadow-lg/5 rounded-md", 
      "focus-within:ring-3 focus-within:ring-accent/20 focus-within:border-accent/40",
      className
      )}>
      <input
        type={type === "password" && visible ? "text" : type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:text-primary selection:bg-accent/20 dark:bg-input/30 flex h-9 w-full min-w-0 px-3 py-1 text-sm sm:text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        )}
        {...props}
      />
      <div className={cn("h-9 flex justify-center items-center", (hasVisibilityIcon || hasValidationIcon) && "pr-3")}>
        {hasVisibilityIcon && <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={iconSize} strokeWidth={iconWidth} onClick={setVisible} className="cursor-pointer text-primary" />}
        {hasValidationIcon && <HugeiconsIcon icon={validation ? CheckmarkCircle02Icon : CancelCircleIcon} size={iconSize} strokeWidth={iconWidth} className={cn(validation ? "text-success" : "text-error")} />}
      </div>
    </div>
  )
}

export { Input }
