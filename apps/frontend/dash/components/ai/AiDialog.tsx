"use client";

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import type { AiJobResult } from "@crwsync/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AiRun } from "@/hooks/use-ai";
import { cn } from "@/lib/utils";

export const AI_CONTROL =
  "flex items-center h-8 gap-1.5 px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

export const AI_SELECT =
  "h-8 rounded-lg border-[1.5px] border-base-300 bg-background px-2 text-xs font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary";

export function AiButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(AI_CONTROL, active && "border-primary bg-primary/15")}>
      <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4 text-primary" />
      {label}
    </button>
  );
}

export function AiBadge() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5 text-primary" />
      AI-generated. May be inaccurate, check before you rely on it.
    </p>
  );
}

interface AiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  run: AiRun;
  onRun: () => void;
  runLabel: string;
  emptyText: string;
  controls?: ReactNode;
  disabled?: boolean;
  children?: (result: AiJobResult) => ReactNode;
}

export function AiDialog({ open, onOpenChange, title, description, run, onRun, runLabel, emptyText, controls, disabled, children }: AiDialogProps) {
  const { phase, message, result, reset } = run;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>

        <div className="flex flex-wrap items-center gap-2">
          {controls}
          <button type="button" onClick={onRun} disabled={phase === "loading" || disabled} className={cn(AI_CONTROL, "bg-primary text-primary-foreground hover:bg-primary/90 border-primary")}>
            {phase === "idle" ? runLabel : "Run again"}
          </button>
        </div>

        <div role="status" aria-live="polite" className="min-h-24">
          {phase === "loading" && (
            <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Asking Claude. This usually takes a few seconds.
            </div>
          )}
          {phase === "empty" && <p className="py-6 text-sm text-muted-foreground">{emptyText}</p>}
          {phase === "limited" && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{message}</p>
          )}
          {phase === "failed" && (
            <p className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-foreground">
              {message || "The AI request failed."} Chat and boards are not affected.
            </p>
          )}
          {phase === "done" && result && (
            <div className="flex flex-col gap-3">
              <AiBadge />
              {children ? children(result) : <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{result.text}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
