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