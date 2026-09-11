"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { UserIcon, Flag02Icon, Tag01Icon, Calendar04Icon, Cancel01Icon, KanbanIcon, ListViewIcon, Add01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { TaskPriorityEnum } from "@crwsync/types";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import type { BoardFilters, BoardFilterListKey, BoardViewMode, DueDateFilter } from "@/hooks/use-board-filters";

// Shared "glass control" surface — the visual baseline every toolbar button, select and toggle shares.
const CONTROL =
  "flex items-center h-8 gap-1.5 px-3 rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:border-primary cursor-pointer";

const PRIORITY_DOT: Record<TaskPriorityEnum, string> = {
  NONE: "bg-muted-foreground",
  LOW: "bg-info",
  MEDIUM: "bg-warning",
  HIGH: "bg-alert",
  URGENT: "bg-error",
};

const DUE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "later", label: "Due later" },
  { value: "none", label: "No due date" },
];

interface BoardToolbarProps {
  workspaceId: string;
  filters: BoardFilters;
  view: BoardViewMode;
  activeFilterCount: number;
  availableAssigneeIds: Set<string>;
  availableLabels: string[];
  onToggleListParam: (key: BoardFilterListKey, value: string) => void;
  onSetDue: (value: DueDateFilter | null) => void;
  onSetView: (value: BoardViewMode) => void;
  onClearFilters: () => void;
  onAddColumn: () => void;
}

export function BoardToolbar({
  workspaceId,
  filters,
  view,
  activeFilterCount,
  availableAssigneeIds,
  availableLabels,
  onToggleListParam,
  onSetDue,
  onSetView,
  onClearFilters,
  onAddColumn,
}: BoardToolbarProps) {
  const { data: members } = useWorkspaceMembers(workspaceId);
  const assignableMembers = (members ?? []).filter((m) => availableAssigneeIds.has(m.user_id));

  return (
    <div className="flex items-center justify-between gap-2 px-6 py-2.5 border-b border-base-200 shrink-0 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {assignableMembers.length > 0 && (
          <FilterPopover label="Assignee" icon={UserIcon} count={filters.assignees.length}>
            {assignableMembers.map((m) => (
              <FilterRow
                key={m.user_id}
                checked={filters.assignees.includes(m.user_id)}
                onCheckedChange={() => onToggleListParam("assignee", m.user_id)}
              >
                <UserAvatar user={m.user} size={5} />
                <span className="truncate">{m.user?.firstname} {m.user?.lastname}</span>
              </FilterRow>
            ))}
          </FilterPopover>
        )}

        <FilterPopover label="Priority" icon={Flag02Icon} count={filters.priorities.length}>
          {Object.values(TaskPriorityEnum).map((priority) => (
            <FilterRow
              key={priority}
              checked={filters.priorities.includes(priority)}
              onCheckedChange={() => onToggleListParam("priority", priority)}
            >
              <span className={cn("size-2.5 rounded-full", PRIORITY_DOT[priority])} />
              <span className="capitalize">{priority.toLowerCase()}</span>
            </FilterRow>
          ))}
        </FilterPopover>

        {availableLabels.length > 0 && (
          <FilterPopover label="Label" icon={Tag01Icon} count={filters.labels.length}>
            {availableLabels.map((label) => (
              <FilterRow
                key={label}
                checked={filters.labels.includes(label)}
                onCheckedChange={() => onToggleListParam("label", label)}
              >
                <span className="truncate">{label}</span>
              </FilterRow>
            ))}
          </FilterPopover>
        )}

        <FilterPopover
          label={DUE_OPTIONS.find((opt) => opt.value === filters.due)?.label ?? "Due date"}
          icon={Calendar04Icon}
          active={!!filters.due}
        >
          {DUE_OPTIONS.map((opt) => (
            <SelectRow
              key={opt.value}
              checked={filters.due === opt.value}
              onClick={() => onSetDue(filters.due === opt.value ? null : opt.value)}
            >
              {opt.label}
            </SelectRow>
          ))}
        </FilterPopover>

        {activeFilterCount > 0 && (
          <button type="button" onClick={onClearFilters} className={cn(CONTROL, "text-muted-foreground")}>
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {view === "kanban" && (
          <button type="button" aria-label="Add column" onClick={onAddColumn} className={CONTROL}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            Add Column
          </button>
        )}

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && onSetView(v as BoardViewMode)}
          className="rounded-lg border-[1.5px] border-base-300 bg-foreground/10 shadow-md/5"
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view" className="h-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <HugeiconsIcon icon={KanbanIcon} strokeWidth={2} className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="h-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <HugeiconsIcon icon={ListViewIcon} strokeWidth={2} className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

function FilterPopover({ label, icon, count, active, children }: { label: string; icon: HugeiconsIconProps["icon"]; count?: number; active?: boolean; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(CONTROL, active && "border-primary text-primary bg-primary/10 hover:bg-primary/15")}>
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
          {label}
          {!!count && count > 0 && (
            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" align="start">
        <div className="flex flex-col max-h-64 overflow-y-auto">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function FilterRow({ checked, onCheckedChange, children }: { checked: boolean; onCheckedChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-base-200 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      {children}
    </label>
  );
}

function SelectRow({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-base-200 cursor-pointer w-full text-left"
    >
      <span className="truncate">{children}</span>
      {checked && <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-3.5 text-primary shrink-0" />}
    </button>
  );
}
