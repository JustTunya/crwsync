import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const variants = {
  enter:  { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: -50 },
};

export const strengthToCount = (strength?: "weak" | "medium" | "strong") => {
  switch(strength) {
    case "weak": return 1;
    case "medium": return 2;
    case "strong": return 3;
    default: return 0;
  }
};

export const strengthToColor = (strength?: "weak" | "medium" | "strong") => {
  switch(strength) {
    case "weak": return "var(--color-error)";
    case "medium": return "var(--color-warning)";
    case "strong": return "var(--color-success)";
    default: return "var(--color-base-400)";
  }
};