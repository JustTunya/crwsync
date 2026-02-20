import Link from "next/link";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Settings02Icon } from "@hugeicons/core-free-icons";
import { useUpdateModule, useDeleteModule } from "@/hooks/use-workspace-modules";
import { Shortcut } from "@/components/ui/shortcut";
import { cn } from "@/lib/utils";

interface SidebarModuleProps {
  id: string; // Added id prop
  activeWorkspaceId: string; // Added activeWorkspaceId prop
  icon: HugeiconsIconProps["icon"];
  name: string;
  href: string;
  active?: boolean;
  extended?: boolean;
  isOverlay?: boolean;
}

export function SidebarModule({ id, activeWorkspaceId, icon, name, href, active, extended, isOverlay }: SidebarModuleProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: isOverlay });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const updateModule = useUpdateModule(activeWorkspaceId);
  const deleteModule = useDeleteModule(activeWorkspaceId);

  const [showSettingsBtn, setShowSettingsBtn] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [moduleName, setModuleName] = useState<string>(name);
  const [rename, setRename] = useState<boolean>(false);

  useEffect(() => {
    setModuleName(name);
  }, [name]);

  const handleMouseEvent = (state: boolean) => {
    setShowSettingsBtn(state);
    setShowSettings(false);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(false);
    setRename(true);
  };

  const handleRenameSubmit = async () => {
    if (moduleName.trim() && moduleName !== name) {
      await updateModule.mutateAsync({
        moduleId: id,
        data: { name: moduleName.trim() },
      });
    } else {
      setModuleName(name);
    }
    setRename(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(false);
    if (confirm("Are you sure you want to delete this module?")) {
      await deleteModule.mutateAsync(id);
    }
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative h-10 w-full flex items-center justify-center pointer-events-none"
      >
        <div className="w-full h-[2px] bg-primary shadow-[0_0_8px_var(--color-primary,rgba(59,130,246,0.8))] rounded-full z-50" />
      </div>
    );
  }

  return (
    <Link
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      href={href}
      onMouseEnter={() => handleMouseEvent(true)}
      onMouseLeave={() => handleMouseEvent(false)}
      style={style}
      className={cn(
        "relative flex flex-row items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition-colors outline-none",
        isOverlay ? "bg-base-200 shadow-2xl ring-1 ring-primary/20 scale-105" : "hover:bg-base-200"
      )}
    >
      <div className={cn("flex-1 flex flex-row items-center gap-2 min-w-0", !extended && "justify-center")}>
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.75}
          className="size-4.5 z-10"
        />
        <AnimatePresence>
          {extended && !rename && (
            <motion.p
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="text-foreground text-xs font-medium truncate z-10"
            >
              {name}
            </motion.p>
          )}
          {extended && rename && (
            <motion.input
              type="text"
              autoFocus
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onBlur={handleRenameSubmit}
              onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") {
                    setModuleName(name);
                    setRename(false);
                }
              }}
              className="text-foreground text-xs font-medium truncate z-10 border-none outline-none bg-transparent w-full"
            />
          )}
        </AnimatePresence>
      </div>

      {extended && showSettingsBtn && !rename && (
        <button className="z-10 cursor-pointer" onClick={handleSettingsClick}>
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} className="size-4" />
        </button>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ backgroundPosition: "0% 75%" }}
            animate={{ backgroundPosition: active ? "75% 0%" : "0% 75%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 rounded-lg bg-linear-240 from-primary/80 dark:from-primary/40 via-base-200 to-base-200 bg-size-[200%_100%]"
          />
        )}
      </AnimatePresence>

      {extended && showSettings && (
        <div className="absolute right-0 top-6 flex flex-col gap-1 z-30 p-1 bg-base-100 border border-base-200 rounded-lg shadow-lg">
          <button
            onClick={handleRenameClick}
            className="w-full px-2 py-1 text-xs text-left hover:bg-base-200 rounded-md transition-colors cursor-pointer"
          >
            Rename
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-2 py-1 text-xs text-left text-error hover:bg-base-200 rounded-md transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </Link>
  );
}

interface SidebarGlobalModuleProps {
  icon: HugeiconsIconProps["icon"];
  name: string;
  href: string;
  shortcut?: string[];
  active?: boolean;
  extended?: boolean;
}

export function SidebarGlobalModule({ icon, name, href, shortcut, active, extended }: SidebarGlobalModuleProps) {
  return (
    <Link
      href={href}
      className="relative flex flex-row items-center justify-between gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors overflow-hidden"
    >
      <div className={cn("flex flex-row items-center gap-2 w-full", !extended && "justify-center")}>
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.75}
          className="size-4.5 z-10"
        />
        <AnimatePresence>
          {extended && (
            <motion.p
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="text-foreground text-xs font-medium truncate z-10"
            >
              {name}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {shortcut && extended && <Shortcut chars={shortcut} />}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ backgroundPosition: "0% 75%" }}
            animate={{ backgroundPosition: active ? "75% 0%" : "0% 75%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 rounded-lg bg-linear-240 from-primary/80 dark:from-primary/40 via-base-200 to-base-200 bg-size-[200%_100%]"
          />
        )}
      </AnimatePresence>
    </Link>
  );
}

export function SidebarNoModule({
  message,
  extended,
}: {
  message?: string;
  extended?: boolean;
}) {
  return (
    <motion.div
      animate={{
        width: extended ? "100%" : "0",
        padding: extended ? "4px" : "8px",
      }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="flex items-center justify-center rounded-full border-[1.5px] border-dashed border-base-300 mx-auto overflow-hidden"
    >
      {extended && message && (
        <motion.p
          key="no-module-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="text-muted-foreground text-xs italic text-center whitespace-nowrap"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}
