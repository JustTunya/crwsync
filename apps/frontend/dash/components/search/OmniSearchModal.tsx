"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  CheckmarkSquare02Icon,
  Chat01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { SidebarModule, SidebarGlobalModule } from "@/components/sidebar/SidebarModule";
import { getModules, getModuleIcon, getModuleHref, isModuleActive } from "@/lib/sidebar.utils";
import { useOmniSearch } from "@/hooks/use-search";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { WorkspaceModule } from "@crwsync/types";

interface OmniSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  workspaceId: string;
  localModules: WorkspaceModule[] | undefined;
  pathname: string;
  onNavigate?: () => void;
}

type ResultRow = { key: string; onSelect: () => void };

export function OmniSearchModal({
  open,
  onOpenChange,
  slug,
  workspaceId,
  localModules,
  pathname,
  onNavigate,
}: OmniSearchModalProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const modules = getModules(slug);
  const queryLower = query.toLowerCase();
  const filteredGlobal = modules.filter((m) => m.name.toLowerCase().includes(queryLower));
  const filteredLocal = localModules?.filter((m) => m.name.toLowerCase().includes(queryLower)) || [];

  const { data: results, isLoading } = useOmniSearch(workspaceId, query);

  const close = () => {
    onOpenChange(false);
    onNavigate?.();
  };

  const goToTask = (boardId: string, taskId: string) => {
    router.push(`/${slug}/board/${boardId}?taskId=${taskId}`);
    close();
  };
  const goToChat = (roomId: string, messageId: string) => {
    router.push(`/${slug}/chat/${roomId}?messageId=${messageId}`);
    close();
  };
  const goToFile = (fileRoomId: string, fileId: string) => {
    router.push(`/${slug}/files/${fileRoomId}?fileId=${fileId}`);
    close();
  };
  const goToMember = (memberId: string) => {
    router.push(`/${slug}/settings/members?memberId=${memberId}`);
    close();
  };
  const goToModule = (mod: WorkspaceModule) => {
    router.push(getModuleHref(slug, mod));
    close();
  };

  const rows: ResultRow[] = useMemo(() => {
    const list: ResultRow[] = [];
    filteredGlobal.forEach((m) => list.push({ key: `global-${m.name}`, onSelect: () => { router.push(m.href); close(); } }));
    filteredLocal.forEach((m) => list.push({ key: `module-${m.id}`, onSelect: () => goToModule(m) }));
    (results?.tasks || []).forEach((t) => list.push({ key: `task-${t.id}`, onSelect: () => goToTask(t.boardId, t.id) }));
    (results?.chats || []).forEach((c) => list.push({ key: `chat-${c.id}`, onSelect: () => goToChat(c.roomId, c.id) }));
    (results?.files || []).forEach((f) => list.push({ key: `file-${f.id}`, onSelect: () => goToFile(f.fileRoomId, f.id) }));
    (results?.members || []).forEach((m) => list.push({ key: `member-${m.id}`, onSelect: () => goToMember(m.id) }));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGlobal, filteredLocal, results]);

  useEffect(() => {
    document.getElementById(`search-row-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const rowClass = cn(
    "flex items-center gap-2.5 px-2.5 rounded-lg cursor-pointer hover:bg-base-200/70 transition-colors",
    isMobile ? "min-h-11 py-2" : "py-1.5",
  );

  const badgeClass = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0";
  const sectionLabelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2.5 pt-3 pb-1";

  const noModuleResults = filteredGlobal.length === 0 && filteredLocal.length === 0;
  const hasServerResults = !!results && (results.tasks.length || results.chats.length || results.files.length || results.members.length);
  const showEmpty = query.trim().length >= 2 && !isLoading && noModuleResults && !hasServerResults;

  let rowIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-label="Search Workspace"
        className={cn(
          "gap-0 p-0 overflow-hidden bg-base-100",
          isMobile ? "max-w-full h-dvh rounded-none flex flex-col" : "max-w-md rounded-2xl",
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <DialogDescription className="sr-only">Search modules, tasks, chats, files, and members</DialogDescription>
        <div className="flex items-center px-4 border-b border-base-200 shrink-0">
          <HugeiconsIcon icon={Search01Icon} className="mr-2 size-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                rows[activeIndex]?.onSelect();
              }
            }}
            placeholder="Search modules, tasks, chats, files, members..."
            aria-label="Search modules, tasks, chats, files, members"
            className="flex-1 focus-within:ring-0 focus-within:border-transparent border-0 px-0 shadow-none bg-transparent text-sm"
            autoFocus
          />
        </div>
        <div className={cn("overflow-y-auto p-2 flex flex-col", isMobile ? "flex-1" : "max-h-[400px]")}>
          {showEmpty && (
            <p className="text-sm text-muted-foreground text-center py-6">No results for &quot;{query}&quot;</p>
          )}
          {noModuleResults && query.trim().length < 2 && !hasServerResults && (
            <p className="text-sm text-muted-foreground text-center py-6">No modules found.</p>
          )}

          {filteredGlobal.map((module) => {
            const index = rowIndex++;
            return (
              <div
                key={module.name}
                id={`search-row-${index}`}
                onClick={() => { router.push(module.href); close(); }}
                className={cn(rowClass, index === activeIndex && "bg-base-200/70")}
              >
                <SidebarGlobalModule
                  icon={module.icon}
                  name={module.name}
                  href={module.href}
                  shortcut={module.shortcut}
                  active={pathname === module.href}
                  extended={true}
                />
              </div>
            );
          })}

          {filteredLocal.map((mod) => {
            const index = rowIndex++;
            return (
              <div
                key={mod.id}
                id={`search-row-${index}`}
                onClick={() => goToModule(mod)}
                className={cn("rounded-lg transition-colors", index === activeIndex && "bg-base-200/70")}
              >
                <SidebarModule
                  id={mod.id}
                  activeWorkspaceId={workspaceId}
                  icon={getModuleIcon(mod.type)}
                  name={mod.name}
                  href={getModuleHref(slug, mod)}
                  active={isModuleActive(pathname, slug, mod)}
                  extended={true}
                  unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                  isPinned={mod.isPinned}
                />
              </div>
            );
          })}

          {isLoading && query.trim().length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-3">Searching...</p>
          )}

          {!!results?.tasks.length && (
            <>
              <div className={sectionLabelClass}>Tasks</div>
              {results.tasks.map((t) => {
                const index = rowIndex++;
                return (
                  <div
                    key={t.id}
                    id={`search-row-${index}`}
                    onClick={() => goToTask(t.boardId, t.id)}
                    className={cn(rowClass, index === activeIndex && "bg-base-200/70")}
                  >
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.boardName} › {t.columnName}</p>
                    </div>
                    <span className={badgeClass}>{t.shortId}</span>
                  </div>
                );
              })}
            </>
          )}

          {!!results?.chats.length && (
            <>
              <div className={sectionLabelClass}>Chats</div>
              {results.chats.map((c) => {
                const index = rowIndex++;
                return (
                  <div
                    key={c.id}
                    id={`search-row-${index}`}
                    onClick={() => goToChat(c.roomId, c.id)}
                    className={cn(rowClass, index === activeIndex && "bg-base-200/70")}
                  >
                    <HugeiconsIcon icon={Chat01Icon} className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.content}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.roomName || "Direct message"}</p>
                    </div>
                    <span className={badgeClass}>Chat</span>
                  </div>
                );
              })}
            </>
          )}

          {!!results?.files.length && (
            <>
              <div className={sectionLabelClass}>Files</div>
              {results.files.map((f) => {
                const index = rowIndex++;
                return (
                  <div
                    key={f.id}
                    id={`search-row-${index}`}
                    onClick={() => goToFile(f.fileRoomId, f.id)}
                    className={cn(rowClass, index === activeIndex && "bg-base-200/70")}
                  >
                    <HugeiconsIcon icon={File01Icon} className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.fileName}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.fileRoomName || "Files"}</p>
                    </div>
                    <span className={badgeClass}>File</span>
                  </div>
                );
              })}
            </>
          )}

          {!!results?.members.length && (
            <>
              <div className={sectionLabelClass}>Members</div>
              {results.members.map((m) => {
                const index = rowIndex++;
                return (
                  <div
                    key={m.id}
                    id={`search-row-${index}`}
                    onClick={() => goToMember(m.id)}
                    className={cn(rowClass, index === activeIndex && "bg-base-200/70")}
                  >
                    <UserAvatar user={{ firstname: m.firstname, lastname: m.lastname, avatar_key: m.avatarKey }} size={6} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.firstname} {m.lastname}</p>
                      <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                    </div>
                    <span className={badgeClass}>{m.role}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
