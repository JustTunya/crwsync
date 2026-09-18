"use client";

import { useState } from "react";
import { Tabs } from "radix-ui";
import { m } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AtIcon,
  Attachment01Icon,
  Chat01Icon,
  CheckmarkSquare02Icon,
  CloudUploadIcon,
  FavouriteIcon,
  File01Icon,
  Image01Icon,
  Search01Icon,
  SentIcon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const SURFACES = [
  {
    id: "chat",
    title: "Rooms and direct messages",
    detail: "Replies, reactions, mentions, read receipts, typing, and attachments. Sent optimistically, persisted through a queue.",
  },
  {
    id: "files",
    title: "File rooms",
    detail: "Uploads go straight to object storage on presigned URLs. Downloads use signed links that expire.",
  },
  {
    id: "schedules",
    title: "Schedules",
    detail: "Every board's due dates on one week view, so the crew sees what is late before standup does.",
  },
  {
    id: "search",
    title: "Search and notifications",
    detail: "One search box across tasks, messages, and files. Assignments and mentions arrive on your personal socket room.",
  },
];

export function Surfaces() {
  const [value, setValue] = useState(SURFACES[0].id);

  return (
    <Tabs.Root value={value} onValueChange={setValue} orientation="vertical" className="grid gap-4 lg:grid-cols-12 lg:gap-8">
      <Tabs.List aria-label="Product surfaces" className="flex gap-1 overflow-x-auto lg:col-span-4 lg:flex-col lg:overflow-visible">
        {SURFACES.map((surface) => (
          <Tabs.Trigger
            key={surface.id}
            value={surface.id}
            className={cn(
              "relative shrink-0 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground transition-colors",
              "hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:px-4 lg:py-3.5"
            )}
          >
            <span className="block">{surface.title}</span>
            <span className="mt-1 hidden text-sm font-normal leading-snug text-muted-foreground lg:block">{surface.detail}</span>
            {surface.id === value && (
              <m.span layoutId="surface-marker" className="absolute inset-y-3 -left-px hidden w-0.5 rounded-full bg-primary lg:block" />
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="lg:col-span-8">
        <p className="mb-3 text-sm text-muted-foreground lg:hidden">{SURFACES.find((s) => s.id === value)?.detail}</p>
        <Tabs.Content value="chat" className="focus-visible:outline-none">
          <Frame title="# launch" meta="5 members">
            <ChatMock />
          </Frame>
        </Tabs.Content>
        <Tabs.Content value="files" className="focus-visible:outline-none">
          <Frame title="Design assets" meta="4 files">
            <FilesMock />
          </Frame>
        </Tabs.Content>
        <Tabs.Content value="schedules" className="focus-visible:outline-none">
          <Frame title="Week 38" meta="3 due, 1 overdue">
            <SchedulesMock />
          </Frame>
        </Tabs.Content>
        <Tabs.Content value="search" className="focus-visible:outline-none">
          <Frame title="Search" meta="Ctrl K">
            <SearchMock />
          </Frame>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

function Frame({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return (
    <div aria-hidden className="min-h-[24rem] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex h-10 items-center gap-3 border-b border-border px-4 text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{meta}</span>
        <span className="ml-auto flex -space-x-1.5">
          {["M", "K", "J"].map((initial) => (
            <span key={initial} className="flex size-5 items-center justify-center rounded-full border border-card bg-foreground/10 text-[9px] font-semibold">
              {initial}
            </span>
          ))}
        </span>
      </div>
      {children}
    </div>
  );
}

function Avatar({ initial, className }: { initial: string; className?: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold", className)}>
      {initial}
    </span>
  );
}

function ChatMock() {
  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <div className="flex gap-3">
        <Avatar initial="M" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">Mara</span>
            <span className="text-xs text-muted-foreground">14:01</span>
          </div>
          <p className="mt-0.5 leading-snug">
            Refresh rotation is in review. <span className="rounded bg-primary/12 px-1 font-medium text-primary">@Kai</span> can you take the board filters after standup?
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-xs text-muted-foreground">
            <HugeiconsIcon icon={FavouriteIcon} className="size-3 text-primary" fill="currentColor" strokeWidth={2} />2
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Avatar initial="K" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">Kai</span>
            <span className="text-xs text-muted-foreground">14:02</span>
            <span className="text-xs text-muted-foreground">edited</span>
          </div>
          <div className="mt-0.5 border-l-2 border-border pl-2 text-xs text-muted-foreground line-clamp-1">Mara: Refresh rotation is in review…</div>
          <p className="mt-1 leading-snug">On it. Filters land today, then I pick up ATL-38.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Avatar initial="J" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">Jonas</span>
            <span className="text-xs text-muted-foreground">14:03</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
            <HugeiconsIcon icon={Image01Icon} className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="font-medium">sync-diagram.png</span>
            <span className="text-muted-foreground">1.2 MB</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Seen by</span>
            <span className="flex -space-x-1">
              <Avatar initial="M" className="size-4 text-[8px] border border-card" />
              <Avatar initial="K" className="size-4 text-[8px] border border-card" />
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex gap-0.5">
          <span className="size-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0ms]" />
          <span className="size-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:200ms]" />
          <span className="size-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:400ms]" />
        </span>
        Kai is typing
      </div>

      <div className="mt-auto flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <HugeiconsIcon icon={Attachment01Icon} className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1 text-sm text-placeholder">Message # launch</span>
        <HugeiconsIcon icon={SentIcon} className="size-4 text-primary" strokeWidth={1.75} />
      </div>
    </div>
  );
}

const files = [
  { name: "sync-diagram.png", size: "1.2 MB", by: "Jonas", when: "2 min ago", icon: Image01Icon },
  { name: "launch-checklist.pdf", size: "384 KB", by: "Mara", when: "Yesterday", icon: File01Icon },
  { name: "brand-tokens.json", size: "12 KB", by: "Kai", when: "Mon", icon: File01Icon },
];

function FilesMock() {
  return (
    <div className="p-4 text-sm">
      <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <HugeiconsIcon icon={CloudUploadIcon} className="size-4" strokeWidth={1.75} />
          Drop files here or browse
        </span>
        <span>Up to 60 uploads an hour</span>
      </div>

      <ul className="mt-3 divide-y divide-border">
        <li className="flex items-center gap-3 py-2.5">
          <HugeiconsIcon icon={Image01Icon} className="size-5 text-muted-foreground" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-medium">hero-poster@2x.png</span>
              <span className="text-xs text-primary">62%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/8">
              <div className="h-full w-[62%] rounded-full bg-primary" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Uploading directly to the bucket on a presigned URL</div>
          </div>
        </li>
        {files.map((file) => (
          <li key={file.name} className="flex items-center gap-3 py-2.5">
            <HugeiconsIcon icon={file.icon} className="size-5 text-muted-foreground" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">{file.size}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {file.by}, {file.when}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const days = [
  { day: "Mon", date: 14, items: [{ id: "ATL-29", title: "Presigned uploads to R2", tone: "late" }], mobile: true },
  { day: "Tue", date: 15, items: [], mobile: false },
  { day: "Wed", date: 16, items: [{ id: "ATL-41", title: "Rotate refresh tokens", tone: "due" }], mobile: true },
  { day: "Thu", date: 17, items: [{ id: "ATL-38", title: "Board filters", tone: "due" }], today: true, mobile: true },
  { day: "Fri", date: 18, items: [{ id: "ATL-35", title: "Redis adapter", tone: "done" }], mobile: true },
  { day: "Sat", date: 19, items: [], mobile: false },
  { day: "Sun", date: 20, items: [], mobile: false },
];

function SchedulesMock() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2">
        {days.map((d) => (
          <div
            key={d.day}
            className={cn(
              "min-h-[16rem] rounded-lg border p-1.5",
              !d.mobile && "hidden sm:block",
              d.today ? "border-primary/50 bg-primary/5" : "border-border bg-background"
            )}
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d.day}</span>
              <span className={cn("text-sm font-semibold", d.today && "text-primary")}>{d.date}</span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {d.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border px-1.5 py-1 text-[10px] leading-tight",
                    item.tone === "late" && "border-error/40 bg-error/10 text-foreground",
                    item.tone === "due" && "border-border bg-card",
                    item.tone === "done" && "border-border bg-card text-muted-foreground line-through"
                  )}
                >
                  <span className="block font-semibold">{item.id}</span>
                  <span className="hidden sm:block">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Pulled from every board in the workspace in one request per week.</p>
    </div>
  );
}

function SearchMock() {
  return (
    <div className="grid gap-4 p-4 text-sm lg:grid-cols-5">
      <div className="lg:col-span-3 rounded-lg border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <HugeiconsIcon icon={Search01Icon} className="size-4 text-muted-foreground" strokeWidth={2} />
          <span className="flex-1">
            filters<span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-primary" />
          </span>
          <span className="rounded border border-border px-1 text-[10px] text-muted-foreground">esc</span>
        </div>
        <SearchGroup label="Tasks" icon={CheckmarkSquare02Icon} rows={["ATL-38  Board filters by assignee and due date", "ATL-22  Saved filter presets per member"]} />
        <SearchGroup label="Messages" icon={Chat01Icon} rows={["Kai in # launch: Filters land today"]} />
        <SearchGroup label="Files" icon={File01Icon} rows={["filters-spec.md in Design assets"]} />
        <div className="px-3 py-2 text-xs text-muted-foreground">Cached per person and query for 30 seconds</div>
      </div>

      <ul className="lg:col-span-2 divide-y divide-border rounded-lg border border-border bg-background">
        <li className="flex gap-3 px-3 py-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Assigned to you</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xs text-muted-foreground">Mara assigned ATL-38 to you</div>
          </div>
        </li>
        <li className="flex gap-3 px-3 py-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-muted-foreground">
            <HugeiconsIcon icon={AtIcon} className="size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="font-semibold">Mentioned in # launch</span>
            <div className="text-xs text-muted-foreground">Mara: can you take the board filters</div>
          </div>
        </li>
        <li className="flex gap-3 px-3 py-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-muted-foreground">
            <HugeiconsIcon icon={Chat01Icon} className="size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="font-semibold">Comment on ATL-41</span>
            <div className="text-xs text-muted-foreground">Jonas: rotation on reuse, not on every refresh</div>
          </div>
        </li>
      </ul>
    </div>
  );
}

function SearchGroup({ label, icon, rows }: { label: string; icon: typeof Search01Icon; rows: string[] }) {
  return (
    <div className="border-b border-border px-3 py-2 last:border-b-0">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row} className="flex items-center gap-2 truncate text-xs">
            <HugeiconsIcon icon={icon} className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="truncate">{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
