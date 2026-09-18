"use client";

import { useEffect, useRef, useState } from "react";
import { m, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ColumnId = "upcoming" | "ongoing" | "complete";
type BoardLayout = Record<ColumnId, string[]>;
type TraceKind = "http" | "db" | "ws" | "cache";

interface DemoTask {
  title: string;
  priority: "Low" | "Medium" | "High";
  label: string;
  labelClass: string;
  assignee: string;
}

interface TraceLine {
  kind: TraceKind;
  text: string;
}

interface DemoState {
  mara: BoardLayout;
  kai: BoardLayout;
  dragging: string | null;
  flash: string | null;
  trace: TraceLine[];
}

const COLUMNS: { id: ColumnId; name: string }[] = [
  { id: "upcoming", name: "Upcoming" },
  { id: "ongoing", name: "Ongoing" },
  { id: "complete", name: "Complete" },
];

const TASKS: Record<string, DemoTask> = {
  "ATL-41": { title: "Rotate refresh tokens on reuse", priority: "High", label: "security", labelClass: "bg-label-red", assignee: "M" },
  "ATL-38": { title: "Board filters by assignee and due date", priority: "Medium", label: "frontend", labelClass: "bg-label-blue", assignee: "K" },
  "ATL-35": { title: "Redis adapter for socket fan-out", priority: "High", label: "infra", labelClass: "bg-label-teal", assignee: "M" },
  "ATL-33": { title: "Retry policy for the email queue", priority: "Low", label: "backend", labelClass: "bg-label-purple", assignee: "J" },
  "ATL-29": { title: "Presigned uploads to R2", priority: "Medium", label: "files", labelClass: "bg-label-green", assignee: "K" },
};

const INITIAL: BoardLayout = { upcoming: ["ATL-41", "ATL-38"], ongoing: ["ATL-35", "ATL-33"], complete: ["ATL-29"] };
const AFTER_FIRST: BoardLayout = { upcoming: ["ATL-38"], ongoing: ["ATL-41", "ATL-35", "ATL-33"], complete: ["ATL-29"] };
const FINAL: BoardLayout = { upcoming: ["ATL-38"], ongoing: ["ATL-41", "ATL-33"], complete: ["ATL-35", "ATL-29"] };

const FIRST_TRACE: TraceLine[] = [
  { kind: "http", text: "PUT /workspaces/atlas/boards/launch/tasks/ATL-41/move  200  41 ms" },
  { kind: "db", text: "$transaction  task.update column_id=ongoing  taskActivity.create COLUMN_MOVED" },
  { kind: "ws", text: "emit board:task:moved  to workspace_atlas  via redis adapter" },
  { kind: "cache", text: "kai  invalidateQueries boardKeys.detail(\"launch\")  1 refetch" },
];

const SECOND_TRACE: TraceLine[] = [
  { kind: "http", text: "PUT /workspaces/atlas/boards/launch/tasks/ATL-35/move  200  37 ms" },
  { kind: "db", text: "$transaction  task.update completed_at=now()  taskActivity.create COLUMN_MOVED" },
  { kind: "ws", text: "emit board:task:moved  to workspace_atlas  via redis adapter" },
  { kind: "cache", text: "kai  invalidateQueries boardKeys.detail(\"launch\")  1 refetch" },
];

const START: DemoState = { mara: INITIAL, kai: INITIAL, dragging: null, flash: null, trace: [] };
const SETTLED: DemoState = { mara: FINAL, kai: FINAL, dragging: null, flash: null, trace: SECOND_TRACE };

type Patch = Partial<DemoState> | ((prev: DemoState) => Partial<DemoState>);

const pushTrace = (line: TraceLine) => (prev: DemoState) => ({ trace: [...prev.trace, line] });

const SCRIPT: [number, Patch][] = [
  [0, START],
  [900, { dragging: "ATL-41" }],
  [1500, { mara: AFTER_FIRST }],
  [1900, { dragging: null }],
  [1900, pushTrace(FIRST_TRACE[0])],
  [2150, pushTrace(FIRST_TRACE[1])],
  [2400, pushTrace(FIRST_TRACE[2])],
  [2650, { kai: AFTER_FIRST, flash: "ATL-41" }],
  [2650, pushTrace(FIRST_TRACE[3])],
  [3500, { flash: null }],
  [5200, { dragging: "ATL-35" }],
  [5800, { mara: FINAL }],
  [6200, { dragging: null }],
  [6200, pushTrace(SECOND_TRACE[0])],
  [6450, pushTrace(SECOND_TRACE[1])],
  [6700, pushTrace(SECOND_TRACE[2])],
  [6950, { kai: FINAL, flash: "ATL-35" }],
  [6950, pushTrace(SECOND_TRACE[3])],
  [7800, { flash: null }],
];

const LOOP_MS = 10_500;

const KIND_CLASS: Record<TraceKind, string> = {
  http: "text-info",
  db: "text-warning",
  ws: "text-primary",
  cache: "text-success",
};

export function SyncDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<DemoState>(START);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const timers = SCRIPT.map(([at, patch]) =>
      window.setTimeout(() => setState((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) })), at)
    );
    timers.push(window.setTimeout(() => setCycle((c) => c + 1), LOOP_MS));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reducedMotion, cycle]);

  const shown = reducedMotion ? SETTLED : state;
  const visibleTrace = shown.trace.slice(-4);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Two dashboard tabs side by side. Mara moves a task from Upcoming to Ongoing and the same card appears in Kai's tab a moment later, with the API trace underneath."
      className="flex flex-col gap-3"
    >
      <div aria-hidden className="grid gap-3 md:grid-cols-2">
        <BoardTab owner="mara" layout={shown.mara} dragging={shown.dragging} flash={null} actor />
        <BoardTab owner="kai" layout={shown.kai} dragging={null} flash={shown.flash} />
      </div>

      <div aria-hidden className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 h-8 px-3 border-b border-border text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          <span className="font-semibold text-foreground">api</span>
          <span>request and socket trace</span>
        </div>
        <ol className="h-[6.25rem] px-3 py-2 font-mono text-[11px] sm:text-xs leading-5 overflow-hidden">
          {visibleTrace.map((line, i) => (
            <m.li
              key={`${shown.trace.length - visibleTrace.length + i}-${line.text}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-[3.25rem_1fr] gap-2 whitespace-nowrap"
            >
              <span className={cn("font-semibold", KIND_CLASS[line.kind])}>{line.kind}</span>
              <span className="text-foreground/85 truncate">{line.text}</span>
            </m.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

interface BoardTabProps {
  owner: string;
  layout: BoardLayout;
  dragging: string | null;
  flash: string | null;
  actor?: boolean;
}

function BoardTab({ owner, layout, dragging, flash, actor }: BoardTabProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 h-9 px-3 border-b border-border text-xs">
        <span className="size-1.5 rounded-full bg-success" />
        <span className="font-semibold">{owner}</span>
        <span className="text-muted-foreground truncate">dash.crwsync.xyz/atlas/board/launch</span>
        {actor && <span className="ml-auto rounded-full border border-border px-1.5 py-px text-[10px] font-semibold text-muted-foreground">moving</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-1.5 sm:gap-2 sm:p-2">
        {COLUMNS.map((column) => (
          <div key={column.id} className="min-w-0 rounded-lg border border-border/70 bg-background p-1.5 min-h-[14.5rem]">
            <div className="flex items-center justify-between px-1 pb-1.5 text-[11px] font-semibold">
              <span>{column.name}</span>
              <span className="text-muted-foreground">{layout[column.id].length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {layout[column.id].map((id) => (
                <TaskCard key={id} owner={owner} id={id} dragging={dragging === id} flash={flash === id} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TaskCardProps {
  owner: string;
  id: string;
  dragging: boolean;
  flash: boolean;
}

function TaskCard({ owner, id, dragging, flash }: TaskCardProps) {
  const task = TASKS[id];
  return (
    <m.div
      layoutId={`${owner}-${id}`}
      layout="position"
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className={cn(
        "relative rounded-md border border-border bg-card p-1.5 sm:p-2 transition-shadow duration-300",
        dragging && "z-10 shadow-lg shadow-black/10 ring-1 ring-primary/50",
        flash && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
        <span className="font-semibold tracking-tight">{id}</span>
        <span className="flex items-center gap-1 truncate">
          <span className={cn("size-1.5 rounded-full shrink-0", task.labelClass)} />
          <span className="truncate">{task.label}</span>
        </span>
      </div>
      <p className="mt-1 text-[11px] sm:text-xs font-medium leading-snug line-clamp-2 text-foreground">{task.title}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <span
          className={cn(
            "rounded-sm px-1 py-px text-[9px] font-semibold",
            task.priority === "High" ? "bg-primary/12 text-primary" : "bg-foreground/6 text-muted-foreground"
          )}
        >
          {task.priority}
        </span>
        <span className="flex size-4 items-center justify-center rounded-full bg-foreground/10 text-[9px] font-semibold">{task.assignee}</span>
      </div>
      {dragging && (
        <m.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -bottom-2.5 -right-2 flex items-end gap-0.5"
        >
          <svg viewBox="0 0 16 16" className="size-3.5 drop-shadow-sm" aria-hidden>
            <path d="M2 1.5 13.5 8 8 9.2 5.6 14.5z" className="fill-primary" />
          </svg>
          <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-semibold text-primary-foreground">{owner}</span>
        </m.span>
      )}
    </m.div>
  );
}
