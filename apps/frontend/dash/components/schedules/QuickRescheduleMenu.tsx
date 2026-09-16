"use client";

import { useState } from "react";
import { format, addDays, addWeeks, startOfToday } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar04Icon,
  Clock01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DEADLINE_STYLES, formatChipDate } from "@/lib/kanban.utils";
import { cn } from "@/lib/utils";

export interface QuickRescheduleMenuProps {
  dueDate?: string | null;
  onReschedule: (date: string | null) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function QuickRescheduleMenu({
  dueDate,
  onReschedule,
  trigger,
  disabled = false,
  align = "start",
  side = "bottom",
  className,
}: QuickRescheduleMenuProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = dueDate ? new Date(dueDate) : undefined;

  const handleToday = () => {
    onReschedule(startOfToday().toISOString());
    setOpen(false);
  };

  const handleTomorrow = () => {
    onReschedule(addDays(startOfToday(), 1).toISOString());
    setOpen(false);
  };

  const handleNextWeek = () => {
    onReschedule(addWeeks(startOfToday(), 1).toISOString());
    setOpen(false);
  };

  const handleRemove = () => {
    onReschedule(null);
    setOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onReschedule(date.toISOString());
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            disabled={disabled}
            data-testid="reschedule-trigger"
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border transition-colors cursor-pointer",
              dueDate
                ? DEADLINE_STYLES(dueDate)
                : "text-muted-foreground hover:text-foreground border-dashed border-border hover:border-border/80 hover:bg-muted/30",
              className
            )}
          >
            <HugeiconsIcon
              icon={Calendar04Icon}
              strokeWidth={2}
              className="size-3.5 shrink-0"
            />
            <span>{dueDate ? formatChipDate(dueDate) : "Add date"}</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1 mb-2">
          <button
            type="button"
            data-testid="preset-today"
            onClick={handleToday}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/40 text-left transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Calendar04Icon}
                strokeWidth={2}
                className="size-3.5 text-primary"
              />
              Today
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {format(startOfToday(), "EEE")}
            </span>
          </button>
          <button
            type="button"
            data-testid="preset-tomorrow"
            onClick={handleTomorrow}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/40 text-left transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                className="size-3.5 text-warning"
              />
              Tomorrow
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {format(addDays(startOfToday(), 1), "EEE")}
            </span>
          </button>
          <button
            type="button"
            data-testid="preset-next-week"
            onClick={handleNextWeek}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/40 text-left transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Calendar04Icon}
                strokeWidth={2}
                className="size-3.5 text-info"
              />
              Next Week
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {format(addWeeks(startOfToday(), 1), "MMM d")}
            </span>
          </button>
          {dueDate && (
            <button
              type="button"
              data-testid="preset-remove-date"
              onClick={handleRemove}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-error/10 text-error text-left transition-colors cursor-pointer"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-3.5 text-error"
              />
              Remove Due Date
            </button>
          )}
        </div>
        <div className="h-px bg-border my-1" />
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate || new Date()}
          onSelect={handleDateSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
