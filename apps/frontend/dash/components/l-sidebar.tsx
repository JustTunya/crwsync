"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Menu05Icon, ZapIcon } from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { AddModuleModal } from "@/components/add-module-modal";
import { Input } from "@/components/ui/input";
import { Shortcut } from "@/components/ui/shortcut";
import { useLSidebar } from "@/hooks/use-l-sidebar";
import { useRSidebar } from "@/hooks/use-r-sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWorkspaceModules, useReorderModules } from "@/hooks/use-workspace-modules";
import { useHotkey } from "@/hooks/use-hotkey";
import { cn } from "@/lib/utils";

import { getModules, getModuleIcon, getModuleHref, isModuleActive } from "./sidebar/sidebar.utils";
import { useUserStatus } from "@/hooks/use-user-status";
import { useModuleDnd } from "@/hooks/use-module-dnd";
import { SidebarWorkspace } from "./sidebar/SidebarWorkspace";
import { SidebarModule, SidebarGlobalModule, SidebarNoModule } from "./sidebar/SidebarModule";
import { SidebarProfile } from "./sidebar/SidebarProfile";
import { SidebarProject } from "./sidebar/SidebarProject";
import { SectionHeader } from "./sidebar/SectionHeader";

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
const fading: Transition = { duration: 0.15, ease: [0.4, 0, 0.2, 1] };

export function LSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const { activeWorkspace } = useWorkspace();
  const { open, toggleOpen, setOpen } = useLSidebar();

  const { status, handleStatusChange } = useUserStatus();

  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [pathname, isMobile, setOpen]);

  const slug = activeWorkspace?.slug || "";
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const { data: wsModules } = useWorkspaceModules(activeWorkspace?.id);
  const reorderModules = useReorderModules(activeWorkspace?.id || "");

  const [localModules, setLocalModules] = useState(wsModules);

  useEffect(() => {
    setLocalModules(wsModules);
  }, [wsModules]);

  const { activeId, sensors, handleDragStart, handleDragEnd } = useModuleDnd(
    localModules,
    setLocalModules,
    activeWorkspace?.id,
    reorderModules
  );

  const modules = getModules(slug);

  useHotkey(["ctrl", "1"], () => router.push(`/${slug}`));
  useHotkey(["ctrl", "2"], () => router.push(`/${slug}/tasks`));
  useHotkey(["ctrl", "3"], () => router.push(`/${slug}/schedule`));

  useHotkey(["ctrl", "k"], (e) => {
    e.preventDefault();
    if (!open) toggleOpen();
    setTimeout(
      () => {
        searchRef.current?.focus();
      },
      open ? 0 : 300,
    );
  });

  const sidebarVariants = {
    desktop: {
      width: open ? 280 : 80,
      x: 0,
      position: "relative" as const,
    },
    mobile: {
      width: "82vw",
      x: open ? 0 : "-100%",
      position: "fixed" as const,
      zIndex: 50,
    },
  };

  const { open: rOpen } = useRSidebar();

  return (
    <>
      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        variants={sidebarVariants}
        animate={isMobile ? "mobile" : "desktop"}
        transition={spring}
        className={cn(
          "flex flex-col gap-4 h-screen p-4 bg-base-100 border-r border-base-200 overflow-hidden",
          isMobile ? "fixed left-0 top-0 shadow-2xl" : "sticky top-0",
        )}
      >
        <div className="flex items-center">
          {/* WORKSPACE */}
          <SidebarWorkspace extended={open} />
        </div>

        {/* SEARCH BAR */}
        {open ? (
          <motion.div
            key="search-input"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={fading}
            className="w-full"
          >
            <Input
              ref={searchRef}
              placeholder="Search..."
              className="bg-base-200"
              prefix={
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={1.75}
                  className="size-4 text-placeholder"
                />
              }
              suffix={<Shortcut chars={["ctrl", "K"]} />}
            />
          </motion.div>
        ) : (
          <motion.div
            key="search-icon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex justify-center"
          >
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={1.75}
              className="size-4.5 text-foreground my-2"
            />
          </motion.div>
        )}

        {/* GLOBAL MODULES */}
        <div className="flex flex-col">
          {modules.map((module) => (
            <SidebarGlobalModule
              key={module.name}
              icon={module.icon}
              name={module.name}
              href={module.href}
              shortcut={module.shortcut}
              active={pathname === module.href}
              extended={open}
            />
          ))}
        </div>

        {/* DIVIDER */}
        <div className="h-px w-full bg-base-200 rounded-full" />

        {/* SHARED */}
        <div className="flex flex-col">
          <SectionHeader
            label="Shared"
            extended={open}
            onAdd={() => setAddModuleOpen(true)}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localModules?.map((m) => m.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {localModules && localModules.length > 0 ? (
                  localModules.map((mod) => (
                    <SidebarModule
                      key={mod.id}
                      id={mod.id}
                      activeWorkspaceId={activeWorkspace!.id}
                      icon={getModuleIcon(mod.type)}
                      name={mod.name}
                      href={getModuleHref(slug, mod)}
                      active={isModuleActive(pathname, slug, mod)}
                      extended={open}
                    />
                  ))
                ) : (
                  <SidebarNoModule message="No shared modules yet." extended={open} />
                )}
              </div>
            </SortableContext>
            
            {typeof window !== "undefined" && createPortal(
              <DragOverlay dropAnimation={null}>
                {activeId ? (() => {
                  const mod = localModules?.find((m) => m.id === activeId);
                  if (!mod) return null;
                  return (
                    <SidebarModule
                      id={mod.id}
                      activeWorkspaceId={activeWorkspace!.id}
                      icon={getModuleIcon(mod.type)}
                      name={mod.name}
                      href={getModuleHref(slug, mod)}
                      active={isModuleActive(pathname, slug, mod)}
                      extended={open}
                      isOverlay
                    />
                  );
                })() : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        </div>

        <AddModuleModal
          isOpen={addModuleOpen}
          onClose={() => setAddModuleOpen(false)}
        />

        {/* DIVIDER */}
        <div className="h-px w-full bg-base-200 rounded-full" />

        {/* PROJECTS */}
        <div className="flex flex-col">
          <SectionHeader label="Projects" extended={open} />
          <SidebarProject icon={ZapIcon} name="Demo project" extended={open} />
        </div>

        {/* PROFILE */}
        <SidebarProfile
          status={status}
          setStatus={handleStatusChange}
          extended={open}
        />
      </motion.aside>

      <motion.div
        initial={false}
        transition={spring}
        animate={
          isMobile
            ? {
                left: open ? "calc(91vw - 1rem)" : 16,
                x: 0,
                opacity: rOpen ? 0 : 1,
                pointerEvents: rOpen ? "none" : "auto",
              }
            : {
                left: open ? 296 : 96,
                x: 0,
                opacity: 1,
                pointerEvents: "auto",
              }
        }
        className={cn(
          "fixed top-4 flex items-center justify-center size-8 rounded-full hover:bg-base-300/75 transition-colors cursor-pointer z-50",
        )}
        onClick={toggleOpen}
      >
        <HugeiconsIcon
          icon={Menu05Icon}
          strokeWidth={2}
          className="size-5"
        />
      </motion.div>
    </>
  );
}