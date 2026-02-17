import { ReactNode, ComponentProps, forwardRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffSlashIcon, CheckmarkCircle02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface InputProps extends Omit<ComponentProps<"input">, "prefix" | "suffix"> {
  className?: string;
  visible?: boolean;
  setVisible?: () => void;
  validation?: boolean;
  error?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, visible, setVisible, validation, error, prefix, suffix, ...props }, ref) => {
  const hasVisibilityIcon = type === "password" && visible !== undefined && setVisible;
  const hasValidationIcon = validation !== undefined;

  const iconSize = 18;
  const iconWidth = 1.5;

  return (
    <div className={cn(
      "w-full flex bg-input dark:bg-base-200 border-[1.5px] shadow-md/5 rounded-lg transition-all", 
      "focus-within:ring-1 focus-within:ring-primary",
      error ? "border-error" : "border-base-300",
      className
    )}>
      {prefix && <div className="h-8 flex justify-center items-center pl-2">{prefix}</div>}
      <input
        ref={ref}
        type={type === "password" && visible ? "text" : type}
        data-slot="input"
        className={cn(
          "flex h-8 w-full py-1 text-xs sm:text-sm rounded-lg",
          "placeholder:text-placeholder selection:bg-primary/25 outline-none",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          suffix || hasVisibilityIcon || hasValidationIcon ? "pr-2" : "pr-3",
          prefix ? "pl-2" : "pl-3"
        )}
        {...props}
      />
      <div className={cn("h-8 flex justify-center items-center", (hasVisibilityIcon || hasValidationIcon) && "px-3")}>
        {hasVisibilityIcon && <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={iconSize} strokeWidth={iconWidth} onClick={setVisible} className="cursor-pointer text-primary" />}
        {hasValidationIcon && <HugeiconsIcon icon={validation ? CheckmarkCircle02Icon : CancelCircleIcon} size={iconSize} strokeWidth={iconWidth} className={cn(validation ? "text-success" : "text-error")} />}
      </div>
      {suffix && <div className="h-8 flex justify-center items-center pr-2">{suffix}</div>}
    </div>
  )
})
Input.displayName = "Input"

export { Input }
