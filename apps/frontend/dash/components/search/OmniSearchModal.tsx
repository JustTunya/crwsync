"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarModule, SidebarGlobalModule } from "@/components/sidebar/SidebarModule";
import { getModules, getModuleIcon, getModuleHref, isModuleActive } from "@/lib/sidebar.utils";
import { WorkspaceModule } from "@crwsync/types";

interface OmniSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  activeWorkspaceId: string;
  localModules: WorkspaceModule[] | undefined;
  pathname: string;
}

export function OmniSearchModal({
  open,
  onOpenChange,
  slug,
  activeWorkspaceId,
  localModules,
  pathname,
}: OmniSearchModalProps) {
  const [query, setQuery] = useState("");

  const modules = getModules(slug);
  const queryLower = query.toLowerCase();
  const filteredGlobal = modules.filter((m) => m.name.toLowerCase().includes(queryLower));
  const filteredLocal = localModules?.filter((m) => m.name.toLowerCase().includes(queryLower)) || [];

  const noResults = filteredGlobal.length === 0 && filteredLocal.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden bg-base-100" showCloseButton={false}>
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <DialogDescription className="sr-only">Search modules, tasks, chats, files, and members</DialogDescription>
        <div className="flex items-center px-4 border-b border-base-200">
          <HugeiconsIcon icon={Search01Icon} className="mr-2 size-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="flex-1 focus-within:ring-0 focus-within:border-transparent border-0 px-0 shadow-none bg-transparent text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col">
          {noResults && <p className="text-sm text-muted-foreground text-center py-6">No modules found.</p>}

          {filteredGlobal.map((module) => (
            <div key={module.name} onClick={() => onOpenChange(false)}>
              <SidebarGlobalModule
                icon={module.icon}
                name={module.name}
                href={module.href}
                shortcut={module.shortcut}
                active={pathname === module.href}
                extended={true}
              />
            </div>
          ))}

          {filteredGlobal.length > 0 && filteredLocal.length > 0 && (
            <div className="h-px w-full bg-base-200 rounded-full my-2 shrink-0" />
          )}

          {filteredLocal.map((mod) => (
            <div key={mod.id} onClick={() => onOpenChange(false)}>
              <SidebarModule
                id={mod.id}
                activeWorkspaceId={activeWorkspaceId}
                icon={getModuleIcon(mod.type)}
                name={mod.name}
                href={getModuleHref(slug, mod)}
                active={isModuleActive(pathname, slug, mod)}
                extended={true}
                unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                isPinned={mod.isPinned}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
