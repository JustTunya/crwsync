"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
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
  return <p className="text-xs text-muted-foreground">AI-generated and may be inaccurate. Check it before you rely on it.</p>;
}

interface TextSection {
  heading: string | null;
  lines: string[];
  items: boolean;
}

const EMPTY_LINE = /^(none|nothing|no )/i;

const SECTION_DOT: [RegExp, string][] = [
  [/decision|moved/i, "bg-success"],
  [/open|blocked|overdue/i, "bg-warning"],
  [/owner/i, "bg-info"],
];

function parseSections(text: string): TextSection[] {
  const sections: TextSection[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = !line.startsWith("-") && line.endsWith(":") ? line.slice(0, -1) : null;
    if (heading || !sections.length) sections.push({ heading, lines: [], items: false });
    if (heading) continue;
    const current = sections[sections.length - 1];
    if (line.startsWith("-")) current.items = true;
    current.lines.push(line.replace(/^-\s*/, ""));
  }
  return sections;
}

function AiTextResult({ text }: { text: string }) {
  const sections = parseSections(text);

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/30">
      {sections.map((section, i) => {
        const quiet = section.lines.length === 1 && EMPTY_LINE.test(section.lines[0]);
        const dot = SECTION_DOT.find(([re]) => re.test(section.heading ?? ""))?.[1] ?? "bg-primary";
        return (
          <section key={i} className="flex flex-col gap-2 p-4">
            {section.heading && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span aria-hidden className={cn("size-2 rounded-full", dot)} />
                {section.heading}
              </h3>
            )}
            {quiet ? (
              <p className="text-sm text-muted-foreground">{section.lines[0]}</p>
            ) : section.items ? (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground marker:text-muted-foreground">
                {section.lines.map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-foreground">{section.lines.join(" ")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true), () => undefined)}
      onBlur={() => setCopied(false)}
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/50"
    >
      {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const SKELETON_BARS = [
  ["w-24", "w-full", "w-4/5"],
  ["w-20", "w-3/4", "w-2/3"],
  ["w-28", "w-5/6"],
];

function AiSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4" aria-hidden>
      {SKELETON_BARS.map((bars, i) => (
        <div key={i} className="flex flex-col gap-2">
          {bars.map((w, j) => (
            <div key={j} className={cn("rounded-md bg-muted animate-pulse motion-reduce:animate-none", j === 0 ? "h-3.5" : "h-3", w)} />
          ))}
        </div>
      ))}
    </div>
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
      <DialogContent className="max-h-[85vh] gap-5 overflow-y-auto sm:max-w-xl">
        <div className="flex items-start gap-3 pr-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-5 text-primary" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="text-lg font-semibold leading-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{description}</DialogDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 [&_select]:h-9 [&_select]:min-w-0 [&_select]:max-w-full [&_select]:flex-1">{controls}</div>
          <button
            type="button"
            onClick={onRun}
            disabled={phase === "loading" || disabled}
            className={cn(AI_CONTROL, "h-9 shrink-0 border-primary bg-primary px-4 text-primary-foreground hover:bg-primary/90")}
          >
            {phase !== "idle" && <RefreshCwIcon className={cn("size-3.5", phase === "loading" && "animate-spin motion-reduce:animate-none")} />}
            {phase === "idle" ? runLabel : phase === "loading" ? "Working…" : "Regenerate"}
          </button>
        </div>

        <div role="status" aria-live="polite" className="min-h-24">
          {phase === "loading" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Claude is reading. This usually takes a few seconds.</p>
              <AiSkeleton />
            </div>
          )}
          {phase === "empty" && <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{emptyText}</p>}
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
              {children ? children(result) : <AiTextResult text={result.text ?? ""} />}
              <div className="flex items-center justify-between gap-3">
                <AiBadge />
                {!children && result.text && <CopyButton text={result.text} />}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
