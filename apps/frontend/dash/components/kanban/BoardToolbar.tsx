"use client";

import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { UserIcon, Flag02Icon, Tag01Icon, Calendar04Icon, Cancel01Icon, KanbanIcon, ListViewIcon, Add01Icon, Tick02Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { TaskPriorityEnum } from "@crwsync/types";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  const dueLabel = DUE_OPTIONS.find((opt) => opt.value === filters.due)?.label ?? "Due date";

  const assigneeRows = assignableMembers.map((m) => (
    <FilterRow
      key={m.user_id}
      checked={filters.assignees.includes(m.user_id)}
      onCheckedChange={() => onToggleListParam("assignee", m.user_id)}
    >
      <UserAvatar user={m.user} size={5} />
      <span className="truncate">{m.user?.firstname} {m.user?.lastname}</span>
    </FilterRow>
  ));

  const priorityRows = Object.values(TaskPriorityEnum).map((priority) => (
    <FilterRow
      key={priority}
      checked={filters.priorities.includes(priority)}
      onCheckedChange={() => onToggleListParam("priority", priority)}
    >
      <span className={cn("size-2.5 rounded-full", PRIORITY_DOT[priority])} />
      <span className="capitalize">{priority.toLowerCase()}</span>
    </FilterRow>
  ));

  const labelRows = availableLabels.map((label) => (
    <FilterRow
      key={label}
      checked={filters.labels.includes(label)}
      onCheckedChange={() => onToggleListParam("label", label)}
    >
      <span className="truncate">{label}</span>
    </FilterRow>
  ));

  const dueRows = DUE_OPTIONS.map((opt) => (
    <SelectRow
      key={opt.value}
      checked={filters.due === opt.value}
      onClick={() => onSetDue(filters.due === opt.value ? null : opt.value)}
    >
      {opt.label}
    </SelectRow>
  ));

  const viewToggle = (
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
  );

  if (isMobile) {
    const sections: MobileFilterSection[] = [];
    if (assigneeRows.length > 0) sections.push({ label: "Assignee", rows: assigneeRows });
    sections.push({ label: "Priority", rows: priorityRows });
    if (labelRows.length > 0) sections.push({ label: "Label", rows: labelRows });
    sections.push({ label: "Due date", rows: dueRows });

    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-base-200 shrink-0">
        <MobileFilterSheet count={activeFilterCount} onClearFilters={onClearFilters} sections={sections} />

        <div className="flex items-center gap-2 shrink-0">
          {view === "kanban" && (
            <button type="button" aria-label="Add column" onClick={onAddColumn} className={cn(CONTROL, "px-2.5")}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            </button>
          )}
          {viewToggle}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-6 py-2.5 border-b border-base-200 shrink-0 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {assignableMembers.length > 0 && (
          <FilterPopover label="Assignee" icon={UserIcon} count={filters.assignees.length}>
            {assigneeRows}
          </FilterPopover>
        )}

        <FilterPopover label="Priority" icon={Flag02Icon} count={filters.priorities.length}>
          {priorityRows}
        </FilterPopover>

        {availableLabels.length > 0 && (
          <FilterPopover label="Label" icon={Tag01Icon} count={filters.labels.length}>
            {labelRows}
          </FilterPopover>
        )}

        <FilterPopover label={dueLabel} icon={Calendar04Icon} active={!!filters.due}>
          {dueRows}
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

        {viewToggle}
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
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-base-200 cursor-pointer w-full text-left"
    >
      <span
        className={cn(
          "flex items-center justify-center size-4 rounded-full border-[1.5px] shrink-0 transition-colors",
          checked ? "border-primary bg-primary" : "border-base-300"
        )}
      >
        {checked && <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-2.5 text-primary-foreground" />}
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}

interface MobileFilterSection {
  label: string;
  rows: React.ReactNode[];
}

function MobileFilterSheet({ count, sections, onClearFilters }: { count: number; sections: MobileFilterSection[]; onClearFilters: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={cn(CONTROL, count > 0 && "border-primary text-primary bg-primary/10 hover:bg-primary/15")}>
          <HugeiconsIcon icon={FilterIcon} strokeWidth={2} className="size-3.5" />
          Filters
          {count > 0 && (
            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {count}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 max-w-full w-full rounded-b-none rounded-t-2xl border-b-0 p-0 gap-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:max-w-full"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-base-300 shrink-0" />
        <DialogTitle className="px-4 pt-3 pb-1 text-base font-semibold">Filters</DialogTitle>

        <div className="flex flex-col gap-1 px-2 pb-3 max-h-[60vh] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <p className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{section.label}</p>
              {section.rows}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200">
          {count > 0 && (
            <button type="button" onClick={onClearFilters} className={cn(CONTROL, "text-muted-foreground flex-1 justify-center")}>
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
              Clear filters
            </button>
          )}
          <DialogClose asChild>
            <button type="button" className={cn(CONTROL, "flex-1 justify-center bg-primary border-primary text-primary-foreground hover:bg-primary")}>
              Done
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
