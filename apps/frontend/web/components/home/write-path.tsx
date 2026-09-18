"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs } from "radix-ui";
import { m, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type TraceKind = "client" | "http" | "db" | "queue" | "ws" | "bucket";

interface Step {
  title: string;
  detail: string;
  trace: { kind: TraceKind; text: string };
}

interface Flow {
  id: string;
  label: string;
  steps: Step[];
}

const FLOWS: Flow[] = [
  {
    id: "move",
    label: "Move a task",
    steps: [
      {
        title: "The card lands before the network does",
        detail: "The dashboard patches the board in the React Query cache and rolls back only if the write fails.",
        trace: { kind: "client", text: "useMoveTask  setQueryData(boardKeys.detail(\"launch\"))  +0 ms" },
      },
      {
        title: "One authenticated write",
        detail: "JWT guard, workspace membership guard, UUID pipes, and a whitelisted DTO run before the service sees the request.",
        trace: { kind: "http", text: "PUT /workspaces/:ws/boards/:board/tasks/:task/move  MoveTaskDto" },
      },
      {
        title: "A locked, transactional reorder",
        detail: "A short Redis lock serializes writes to the target column, then one Prisma transaction updates positions and records the activity.",
        trace: { kind: "db", text: "lock:column:ongoing:position  $transaction  task.update ×3  taskActivity.create" },
      },
      {
        title: "Fan-out through Redis",
        detail: "The gateway emits to the workspace room. The Redis adapter delivers it from whichever API instance handled the write.",
        trace: { kind: "ws", text: "emit board:task:moved { boardId, taskId, fromColumnId, toColumnId, position }" },
      },
      {
        title: "Other tabs reconcile",
        detail: "The move payload is positional, so remote tabs refetch the board once. Most other events patch the cache directly.",
        trace: { kind: "client", text: "kai  invalidateQueries(boardKeys.detail(\"launch\"))  GET /boards/launch  200" },
      },
    ],
  },
  {
    id: "message",
    label: "Send a message",
    steps: [
      {
        title: "Sent over the socket with a client id",
        detail: "The bubble renders immediately as pending. The client id lets the sender match the acknowledgement later.",
        trace: { kind: "client", text: "socket.emit(\"send_message\", { roomId, content, client_id })" },
      },
      {
        title: "Acknowledged and broadcast at once",
        detail: "The gateway builds the full message payload, acknowledges the sender, and emits it to the room before touching the database.",
        trace: { kind: "ws", text: "message_ack → sender   new_message → chat_<roomId>" },
      },
      {
        title: "Persistence goes to a queue",
        detail: "A BullMQ job writes the row with the same pre-generated id, so a slow database never blocks the conversation.",
        trace: { kind: "queue", text: "chat_messages.add(\"persist_message\", { preGeneratedId, dto })" },
      },
      {
        title: "Unread counts and mentions follow",
        detail: "Workspace members get an unread increment. Mentioned people get a stored notification on their personal socket room.",
        trace: { kind: "ws", text: "chat:unread_increment → workspace_<id>   notification → user_<id>" },
      },
      {
        title: "Failure is visible, not silent",
        detail: "If persistence fails, the room receives a failure event and the bubble is marked instead of quietly disappearing.",
        trace: { kind: "ws", text: "message_failed { roomId, preGeneratedId }" },
      },
    ],
  },
  {
    id: "upload",
    label: "Upload a file",
    steps: [
      {
        title: "Ask for a presigned URL",
        detail: "The client sends only the file name and content type. Membership and a per-user limit of 60 uploads an hour are enforced here.",
        trace: { kind: "http", text: "POST /workspaces/:ws/file-rooms/:room/files/presign  { fileName, contentType }" },
      },
      {
        title: "A five-minute PUT grant",
        detail: "The API signs a short-lived upload URL for the bucket: Cloudflare R2 in production, MinIO locally.",
        trace: { kind: "http", text: "201 { url, key }  expires in 300 s" },
      },
      {
        title: "Bytes go straight to storage",
        detail: "The browser uploads directly to the bucket. The API never proxies file contents, so uploads do not compete with API traffic.",
        trace: { kind: "bucket", text: "PUT <presigned url>  Content-Type: image/png  200" },
      },
      {
        title: "Confirm and record",
        detail: "A second call records the file against the room. Downloads later use signed GET links that expire after an hour.",
        trace: { kind: "db", text: "POST /file-rooms/:room/files  workspaceFile.create { key, size, mime }" },
      },
      {
        title: "The room updates everywhere",
        detail: "A file event reaches every open tab in the room, and the list patches in place.",
        trace: { kind: "ws", text: "emit file:created → file_room_<id>" },
      },
    ],
  },
];

const KIND_CLASS: Record<TraceKind, string> = {
  client: "text-success",
  http: "text-info",
  db: "text-warning",
  queue: "text-alert",
  ws: "text-primary",
  bucket: "text-muted-foreground",
};

const STEP_MS = 2_000;

export function WritePath() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reducedMotion = usePrefersReducedMotion();
  const [flowId, setFlowId] = useState(FLOWS[0].id);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const flow = FLOWS.find((f) => f.id === flowId) ?? FLOWS[0];
  const stepCount = flow.steps.length;

  useEffect(() => {
    if (reducedMotion || paused || !inView) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % stepCount), STEP_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused, inView, stepCount, flowId]);

  const selectFlow = (id: string) => {
    setFlowId(id);
    setActive(0);
    setPaused(false);
  };

  const selectStep = (i: number) => {
    setActive(i);
    setPaused(true);
  };

  return (
    <Tabs.Root ref={ref} value={flowId} onValueChange={selectFlow}>
      <Tabs.List aria-label="Write paths" className="flex gap-1 overflow-x-auto border-b border-border">
        {FLOWS.map((f) => (
          <Tabs.Trigger
            key={f.id}
            value={f.id}
            className="relative shrink-0 px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring rounded-t-md"
          >
            {f.label}
            {f.id === flowId && <m.span layoutId="write-path-underline" className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {FLOWS.map((f) => (
        <Tabs.Content key={f.id} value={f.id} className="grid gap-6 pt-8 lg:grid-cols-12 lg:gap-10 focus-visible:outline-none">
          <ol className="lg:col-span-7">
            {f.steps.map((step, i) => {
              const isActive = i === active;
              const isDone = i < active;
              return (
                <li key={step.title} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => selectStep(i)}
                    aria-current={isActive ? "step" : undefined}
                    className="grid w-full grid-cols-[1.75rem_1fr] gap-3 py-3.5 text-left rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className={cn(
                        "mt-px flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-300",
                        isActive && "border-primary bg-primary text-primary-foreground",
                        isDone && "border-foreground/20 bg-foreground/10 text-foreground",
                        !isActive && !isDone && "border-border text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold transition-colors duration-300", isActive ? "text-foreground" : "text-foreground/80")}>
                        {step.title}
                      </span>
                      <span className={cn("mt-0.5 block text-sm leading-snug transition-colors duration-300", isActive ? "text-muted-foreground" : "text-muted-foreground/70")}>
                        {step.detail}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="lg:col-span-5 lg:sticky lg:top-28 self-start rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 h-8 px-3 border-b border-border text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              <span className="font-semibold text-foreground">trace</span>
              <span>{f.label.toLowerCase()}</span>
            </div>
            <ol className="min-h-[13.5rem] p-3 font-mono text-[11px] sm:text-xs leading-5">
              {f.steps.slice(0, active + 1).map((step, i) => (
                <m.li
                  key={step.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn("grid grid-cols-[3.5rem_1fr] gap-2 py-0.5", i < active && "opacity-60")}
                >
                  <span className={cn("font-semibold", KIND_CLASS[step.trace.kind])}>{step.trace.kind}</span>
                  <span className="text-foreground/85 break-words">{step.trace.text}</span>
                </m.li>
              ))}
            </ol>
          </div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
