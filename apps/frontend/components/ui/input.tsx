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
    <div className="w-full flex justify-items-center border border-input shadow-xs rounded-md">
      <input
        type={type === "password" && visible ? "text" : type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
    </div>
  )
}

export { Input }
