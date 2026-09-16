"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HomePinnedModule, WorkspaceModule } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { getModuleHref, getModuleIcon } from "@/lib/sidebar.utils";
import { cn } from "@/lib/utils";

export interface HomePinnedModulesSectionProps {
  modules?: HomePinnedModule[];
  slug: string;
  onUnpinModule?: (moduleId: string) => void;
  className?: string;
}

export function HomePinnedModulesSection({ modules, slug, onUnpinModule, className }: HomePinnedModulesSectionProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Bookmark02Icon} className="size-4 text-primary" />
          Pinned Modules
        </h2>
        <span className="text-xs text-muted-foreground font-medium bg-base-200 px-2 py-0.5 rounded-full">
          {modules?.length ?? 0}
        </span>
      </div>

      {modules && modules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="home-pinned-modules-grid">
          {modules.map((mod) => (
            <GlassBox
              key={mod.id}
              className="w-full! mx-0! p-3.5 flex items-center gap-3 relative group hover:bg-base-200/40 hover:border-base-300 transition-all cursor-pointer"
            >
              <Link
                href={getModuleHref(slug, mod as unknown as WorkspaceModule)}
                className="flex-1 flex items-center gap-3 min-w-0 outline-none"
                data-testid="home-pinned-module-link"
              >
                <div className="size-9 rounded-lg bg-base-200/80 text-foreground flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={getModuleIcon(mod.type)} className="size-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {mod.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {mod.badgeCount ? `${mod.badgeCount} items` : mod.type.toLowerCase()}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                title="Unpin module"
                data-testid="home-pinned-module-unpin"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 size-7 rounded-md hover:bg-base-300 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUnpinModule?.(mod.id);
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            </GlassBox>
          ))}
        </div>
      ) : (
        <div
          data-testid="home-pinned-modules-empty-state"
          className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-base-200/80 bg-base-100/40"
        >
          <p className="text-sm text-muted-foreground">
            No pinned modules yet. Pin a module from the sidebar for quick access.
          </p>
        </div>
      )}
    </div>
  );
}
