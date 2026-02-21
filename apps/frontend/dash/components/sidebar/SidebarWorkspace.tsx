import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, m, Transition, LazyMotion, domAnimation } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Tick02Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { useOutclick } from "@/hooks/use-outclick";
import { cn } from "@/lib/utils";

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };

export function SidebarWorkspace({ extended }: { extended?: boolean }) {
  const { activeWorkspace, workspaces, switchWorkspace, loading } =
    useWorkspace();

  const [openWorkspaces, setOpenWorkspaces] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);

  useOutclick(wsRef, () => setOpenWorkspaces(false), openWorkspaces);

  const toggleMenu = () => {
    if (extended && !loading.active) setOpenWorkspaces(!openWorkspaces);
  };

  const handleSwitch = (slug: string) => {
    switchWorkspace(slug);
    setOpenWorkspaces(false);
  };

  if (loading.list && !activeWorkspace) {
    return <div className="h-10 w-full bg-base-200 rounded-lg animate-pulse" />;
  }

  return (
    <div
      ref={wsRef}
      className={cn("relative flex-1", !extended && "flex justify-center")}
    >
      {activeWorkspace ? (
        <button
          onClick={toggleMenu}
          className={cn(
            "flex flex-row items-center gap-3 w-full h-10 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
            !extended && "justify-center",
          )}
        >
          <WorkspaceAvatar
            avatar_key={activeWorkspace.logo_key || ""}
            name={activeWorkspace.name}
          />

          {extended && (
            <div className="flex items-center flex-1 overflow-hidden">
              <p className="text-foreground text-sm font-semibold truncate">
                {activeWorkspace.name}
              </p>

              <div className="ml-auto flex flex-col -space-y-1">
                <HugeiconsIcon
                  icon={ArrowUp01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
              </div>
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={toggleMenu}
          className={cn(
            "flex flex-row items-center gap-3 h-10 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
            !extended && "justify-center",
          )}
        >
          <div className="size-6 rounded-sm border-[1.5px] border-dashed border-base-300" />

          {extended && (
            <div className="flex items-center flex-1 overflow-hidden">
              <p className="text-base-300 text-sm truncate">No Workspace</p>

              <div className="ml-auto flex flex-col -space-y-1">
                <HugeiconsIcon
                  icon={ArrowUp01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
              </div>
            </div>
          )}
        </button>
      )}

      <LazyMotion features={domAnimation} strict>
        <AnimatePresence>
          {extended && openWorkspaces && (
            <m.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={spring}
              className="absolute top-12 left-0 z-50 flex flex-col w-full p-2 bg-base-100 border border-base-200 rounded-xl shadow-xl"
            >
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Workspaces
              </p>

              <div className="flex flex-col gap-1 mb-2 max-h-48 overflow-y-auto">
                {workspaces.map((member) => {
                  const ws = member.workspace;
                  const isActive = ws?.id === activeWorkspace?.id;
                  if (!ws) return null;

                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitch(ws.slug)}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
                        isActive && "bg-base-200",
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <WorkspaceAvatar
                          avatar_key={ws.logo_key || ""}
                          name={ws.name}
                          className="size-5 text-[10px]"
                        />
                        <p className="text-xs font-medium truncate">{ws.name}</p>
                      </div>
                      {isActive && (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          strokeWidth={2}
                          className="size-4.5 text-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="h-px w-full bg-base-200 my-2" />

              <Link
                href="/create-workspace"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 transition-colors text-left cursor-pointer group"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-4 text-muted-foreground group-hover:text-foreground"
                />
                <p className="text-sm font-light text-muted-foreground group-hover:text-foreground">
                  Create Workspace
                </p>
              </Link>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
