"use client";

import { useState } from "react";
import { ModuleTypeEnum, type AiTaskDraft } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import * as aiService from "@/services/ai.service";
import { useAiRun, useAiStatus } from "@/hooks/use-ai";
import { useBoard, useCreateTask } from "@/hooks/use-boards";
import { useWorkspaceModules } from "@/hooks/use-workspace-modules";
import { AI_CONTROL, AI_SELECT, AiButton, AiDialog } from "@/components/ai/AiDialog";
import { cn } from "@/lib/utils";

const HOUR_MS = 3_600_000;

const SINCE_OPTIONS = [
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 24 * 7 },
  { label: "Last 30 days", hours: 24 * 30 },
];

const sinceIso = (hours: number) => new Date(Date.now() - hours * HOUR_MS).toISOString();

function useAiEnabled() {
  return useAiStatus().data?.enabled === true;
}

export function SummarizeRoomButton({ workspaceId, roomId }: { workspaceId: string; roomId: string }) {
  const enabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(50);
  const run = useAiRun(workspaceId);

  if (!enabled) return null;

  return (
    <>
      <AiButton label="Summarize" onClick={() => setOpen(true)} />
      <AiDialog
        open={open}
        onOpenChange={setOpen}
        title="Summarize this room"
        description="Claude reads the most recent messages in this room and lists what was decided and what is still open."
        run={run}
        onRun={() => run.run(() => aiService.summarizeRoom(workspaceId, roomId, limit))}
        runLabel="Summarize"
        emptyText="There are no messages to summarize yet."
        controls={
          <select aria-label="Messages to include" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={AI_SELECT}>
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                Last {n} messages
              </option>
            ))}
          </select>
        }
      />
    </>
  );
}

export function DigestBoardButton({ workspaceId, boardId }: { workspaceId: string; boardId: string }) {
  const enabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(SINCE_OPTIONS[1].hours);
  const run = useAiRun(workspaceId);

  if (!enabled) return null;

  return (
    <>
      <AiButton label="Digest" onClick={() => setOpen(true)} />
      <AiDialog
        open={open}
        onOpenChange={setOpen}
        title="Board digest"
        description="What moved on this board, what is blocked or overdue, and who owns what."
        run={run}
        onRun={() => run.run(() => aiService.digestBoard(workspaceId, boardId, sinceIso(hours)))}
        runLabel="Create digest"
        emptyText="There is nothing on this board to digest yet."
        controls={
          <select aria-label="Period" value={hours} onChange={(e) => setHours(Number(e.target.value))} className={AI_SELECT}>
            {SINCE_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>
                {o.label}
              </option>
            ))}
          </select>
        }
      />
    </>
  );
}

export function StandupButton({ workspaceId, memberId, name }: { workspaceId: string; memberId: string; name: string }) {
  const enabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(24);
  const run = useAiRun(workspaceId);

  if (!enabled) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Stand-up for ${name}`} className="text-[11px] font-semibold text-primary hover:underline cursor-pointer">
        Stand-up
      </button>
      <AiDialog
        open={open}
        onOpenChange={setOpen}
        title={`Stand-up for ${name}`}
        description="A short note built from this member's recent task activity."
        run={run}
        onRun={() => run.run(() => aiService.standup(workspaceId, memberId, sinceIso(hours)))}
        runLabel="Generate"
        emptyText="No recent task activity for this member."
        controls={
          <select aria-label="Period" value={hours} onChange={(e) => setHours(Number(e.target.value))} className={AI_SELECT}>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={24 * 7}>Last 7 days</option>
          </select>
        }
      />
    </>
  );
}

export function ChatAiActions({
  workspaceId,
  roomId,
  selecting,
  onToggleSelecting,
}: {
  workspaceId: string;
  roomId: string;
  selecting: boolean;
  onToggleSelecting: () => void;
}) {
  const enabled = useAiEnabled();
  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2">
      <SummarizeRoomButton workspaceId={workspaceId} roomId={roomId} />
      <AiButton label={selecting ? "Cancel selection" : "Draft tasks"} onClick={onToggleSelecting} active={selecting} />
    </div>
  );
}

export function TaskDraftsDialog({
  workspaceId,
  roomId,
  messageIds,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  roomId: string;
  messageIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const run = useAiRun(workspaceId);
  const { data: modules } = useWorkspaceModules(workspaceId);
  const boards = (modules ?? []).filter((m) => m.type === ModuleTypeEnum.BOARD);
  const [chosenBoardId, setChosenBoardId] = useState("");
  const boardId = chosenBoardId || boards[0]?.reference_id || "";
  const { data: board } = useBoard(workspaceId, boardId);

  return (
    <AiDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Draft tasks from messages"
      description={`Claude proposes tasks from the ${messageIds.length} selected message${messageIds.length === 1 ? "" : "s"}. Nothing is created until you confirm each task.`}
      run={run}
      onRun={() => run.run(() => aiService.draftTasks(workspaceId, roomId, boardId, messageIds))}
      runLabel="Draft tasks"
      emptyText="Claude found no clear tasks in these messages."
      disabled={!boardId || !messageIds.length}
      controls={
        <select
          aria-label="Target board"
          value={boardId}
          onChange={(e) => {
            setChosenBoardId(e.target.value);
            run.reset();
          }}
          className={AI_SELECT}
        >
          {boards.length === 0 && <option value="">No boards</option>}
          {boards.map((b) => (
            <option key={b.reference_id} value={b.reference_id}>
              {b.name}
            </option>
          ))}
        </select>
      }
    >
      {(result) => (
        <ul className="flex flex-col gap-3">
          {(result.drafts ?? []).map((draft, i) => (
            <DraftRow key={`${i}-${draft.title}`} workspaceId={workspaceId} boardId={boardId} draft={draft} columns={board?.columns ?? []} />
          ))}
        </ul>
      )}
    </AiDialog>
  );
}

function DraftRow({
  workspaceId,
  boardId,
  draft,
  columns,
}: {
  workspaceId: string;
  boardId: string;
  draft: AiTaskDraft;
  columns: { id: string; name: string }[];
}) {
  const [title, setTitle] = useState(draft.title);
  const [columnId, setColumnId] = useState(draft.column_id ?? "");
  const [state, setState] = useState<"idle" | "creating" | "created" | "dismissed">("idle");
  const [error, setError] = useState("");
  const createTask = useCreateTask(workspaceId, boardId);
  const targetColumn = columnId || columns[0]?.id;

  if (state === "dismissed") return null;

  async function confirm() {
    if (!targetColumn || !title.trim()) return;
    setState("creating");
    setError("");
    const res = await createTask.mutateAsync({ title: title.trim(), description: draft.description || undefined, column_id: targetColumn });
    if (res.success) setState("created");
    else {
      setError(res.message || "Could not create the task.");
      setState("idle");
    }
  }

  return (
    <li className={cn("flex flex-col gap-2 rounded-lg border border-border p-3", state === "created" && "opacity-70")}>
      <input
        aria-label="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={state !== "idle"}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-primary/50"
      />
      {draft.description && <p className="text-xs text-muted-foreground">{draft.description}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Column" value={targetColumn ?? ""} onChange={(e) => setColumnId(e.target.value)} disabled={state !== "idle"} className={AI_SELECT}>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {state === "created" ? (
          <span className="text-xs font-semibold text-success">Created</span>
        ) : (
          <>
            <button type="button" onClick={confirm} disabled={state === "creating" || !targetColumn} className={cn(AI_CONTROL, "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}>
              {state === "creating" ? "Creating…" : "Create task"}
            </button>
            <button type="button" onClick={() => setState("dismissed")} disabled={state === "creating"} className={AI_CONTROL}>
              Dismiss
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </li>
  );
}

export function MemberStandup({ memberId, name }: { memberId: string; name: string }) {
  const { activeId } = useWorkspace();
  return activeId ? <StandupButton workspaceId={activeId} memberId={memberId} name={name} /> : null;
}
