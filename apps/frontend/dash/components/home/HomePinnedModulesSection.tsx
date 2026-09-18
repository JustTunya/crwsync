"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark02Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HomePinnedModule, WorkspaceModule } from "@crwsync/types";
import { Card } from "@/components/ui/card";
import { getModuleHref, getModuleIcon } from "@/lib/sidebar.utils";
import { cn } from "@/lib/utils";

export interface HomePinnedModulesSectionProps {
  modules?: HomePinnedModule[];
  slug: string;
  onUnpin?: (module: HomePinnedModule) => void;
  className?: string;
}

export function HomePinnedModulesSection({
  modules,
  slug,
  onUnpin,
  className,
}: HomePinnedModulesSectionProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Bookmark02Icon} className="size-4 text-primary" />
          Pinned Modules
        </h2>
        <span className="text-xs text-muted-foreground font-medium bg-muted/60 border border-border/40 px-2 py-0.5 rounded-full">
          {modules?.length ?? 0}
        </span>
      </div>

      {modules && modules.length > 0 ? (
        <div
          className="grid grid-cols-2 lg:grid-cols-3 gap-3 items-stretch"
          data-testid="home-pinned-modules-grid"
        >
          {modules.map((mod) => (
            <Card
              key={mod.id}
              className="h-full p-3.5 rounded-2xl border-border bg-card shadow-sm flex flex-col items-stretch justify-between gap-3 relative group transition-all cursor-pointer"
            >
              <Link
                href={getModuleHref(slug, mod as unknown as WorkspaceModule)}
                className="flex flex-col gap-2 outline-none flex-1 justify-between min-w-0"
                data-testid="home-pinned-module-link"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={getModuleIcon(mod.type)} className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {mod.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {mod.badgeCount ? `${mod.badgeCount} items` : mod.type.toLowerCase()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnpin?.(mod);
                    }}
                    aria-label={`Unpin ${mod.name}`}
                    data-testid="home-pinned-module-unpin-btn"
                    className="size-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-center pt-2 border-t border-border/60 text-[11px] font-medium text-muted-foreground/75 group-hover:text-primary transition-colors">
                  <span>Open module</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-3 group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div
          data-testid="home-pinned-modules-empty-state"
          className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-muted/20"
        >
          <p className="text-sm text-muted-foreground">
            No pinned modules yet. Pin a module from the sidebar for quick access.
          </p>
        </div>
      )}
    </div>
  );
}
