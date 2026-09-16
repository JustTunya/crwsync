"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark02Icon, Cancel01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
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

export function HomePinnedModulesSection({
  modules,
  slug,
  onUnpinModule,
  className,
}: HomePinnedModulesSectionProps) {
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
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch"
          data-testid="home-pinned-modules-grid"
        >
          {modules.map((mod) => (
            <GlassBox
              key={mod.id}
              className="w-full! h-full mx-0! p-3.5 flex flex-col items-stretch justify-between gap-3 relative group hover:bg-base-200/50 hover:border-base-300 transition-all cursor-pointer"
            >
              {/* <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    title="Unpin module"
                    data-testid="home-pinned-module-unpin"
                    className="size-6 rounded-md hover:bg-base-300 text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnpinModule?.(mod.id);
                    }}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                </div>
              </div> */}

              <Link
                href={getModuleHref(slug, mod as unknown as WorkspaceModule)}
                className="flex flex-col gap-2 outline-none flex-1 justify-between min-w-0"
                data-testid="home-pinned-module-link"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
                </div>

                <div className="flex items-center justify-center pt-2 border-t border-base-200/60 text-[11px] font-medium text-muted-foreground/75 group-hover:text-primary transition-colors">
                  <span>Open module</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-3 group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </Link>
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
