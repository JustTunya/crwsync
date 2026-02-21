import { format } from "date-fns";

export const COLUMN_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink"];

export enum TaskPriorityEnum {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export const PRIORITY_STYLES: Record<string, string> = {
  NONE: "text-muted-foreground bg-muted-foreground/10 border-muted-foreground/75",
  LOW: "text-info bg-info/10 border-info/75",
  MEDIUM: "text-warning bg-warning/10 border-warning/75",
  HIGH: "text-alert bg-alert/10 border-alert/75",
  URGENT: "text-error bg-error/10 border-error/75",
};

export const DEADLINE_STYLES = (date: string): string => {
  const today = new Date().setHours(0, 0, 0, 0);
  const deadline = new Date(date).setHours(0, 0, 0, 0);
  const diff = deadline - today;
  
  if (diff < 0) { // EXPIRED
    return "text-error bg-error/10 border-error/75";
  }
  if (diff < 24 * 60 * 60 * 1000) { // TODAY
    return "text-alert bg-alert/10 border-alert/75";
  }
  if (diff < 2 * 24 * 60 * 60 * 1000) { // TOMORROW
    return "text-warning bg-warning/10 border-warning/75";
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) { // THIS WEEK
    return "text-info bg-info/10 border-info/75";
  }
  return "text-muted-foreground bg-muted-foreground/10 border-muted-foreground/75"; // LATER
}

export function formatChipDate(date: string) {
  return format(new Date(date), "MMM d");
}
