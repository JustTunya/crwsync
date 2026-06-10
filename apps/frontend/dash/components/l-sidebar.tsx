"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { m, AnimatePresence, Transition, LazyMotion, domAnimation } from "framer-motion";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Menu05Icon } from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { getModules, getModuleIcon, getModuleHref, isModuleActive } from "@/lib/sidebar.utils";
import { SidebarModule, SidebarGlobalModule, SidebarNoModule } from "@/components/sidebar/SidebarModule";
import { SidebarWorkspace } from "@/components/sidebar/SidebarWorkspace";
import { SidebarProfile } from "@/components/sidebar/SidebarProfile";
import { SidebarProject } from "@/components/sidebar/SidebarProject";
import { SectionHeader } from "@/components/sidebar/SectionHeader";
import { AddModuleModal } from "@/components/add-module-modal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Shortcut } from "@/components/ui/shortcut";
import { Input } from "@/components/ui/input";
import { useLSidebar } from "@/hooks/use-l-sidebar";
import { useRSidebar } from "@/hooks/use-r-sidebar";
import { useUserStatus } from "@/hooks/use-user-status";
import { useModuleDnd } from "@/hooks/use-module-dnd";
import { useWorkspaceProjects, useCreateProject } from "@/hooks/use-workspace-projects";
import { SidebarDroppable } from "@/components/sidebar/SidebarDroppable";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUser } from "@/providers/user.provider";
import { useSocket } from "@/providers/socket.provider";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceModules, useReorderModules, moduleKeys } from "@/hooks/use-workspace-modules";
import { useHotkey } from "@/hooks/use-hotkey";
import { useWorkspaceSocket } from "@/hooks/use-workspace-socket";
import { cn } from "@/lib/utils";
import { WorkspaceModule, WorkspaceProject } from "@crwsync/types";

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
  const user = useUser();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const slug = activeWorkspace?.slug || "";
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [addModuleProjectId, setAddModuleProjectId] = useState<string | undefined>();
  const { data: wsModules } = useWorkspaceModules(activeWorkspace?.id);
  const { data: projects } = useWorkspaceProjects(activeWorkspace?.id);
  const createProject = useCreateProject(activeWorkspace?.id || "");
  const reorderModules = useReorderModules(activeWorkspace?.id || "");

  useWorkspaceSocket(activeWorkspace?.id);


  const [prevWsModules, setPrevWsModules] = useState(wsModules);
  const [localModules, setLocalModules] = useState(wsModules);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setSearchQuery("");
    }
  }

  if (wsModules !== prevWsModules) {
    setPrevWsModules(wsModules);
    setLocalModules(wsModules);
  }

  const handleCreateProject = () => {
    createProject.mutate({ name: "New Project" }, {
      onSuccess: (res) => {
        setEditingProjectId(res.data.id);
      }
    });
  };

  useEffect(() => {
    if (!socket || !activeWorkspace?.id) return;

    const handleUnreadIncrement = ({ roomId, senderId }: { roomId: string; senderId: string }) => {
      if (senderId === user?.id) return;
      queryClient.setQueryData(
        moduleKeys.list(activeWorkspace.id),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((m) => {
              if (m.type === "CHAT" && m.reference_id === roomId) {
                // If the user is currently looking at this exact chat module, don't increment
                const moduleHref = getModuleHref(slug, m);
                if (pathname === moduleHref) return m;
                return { ...m, unreadCount: (m.unreadCount || 0) + 1 };
              }
              return m;
            }),
          };
        }
      );
    };

    socket.on("chat:unread_increment", handleUnreadIncrement);

    return () => {
      socket.off("chat:unread_increment", handleUnreadIncrement);
    };
  }, [socket, activeWorkspace?.id, queryClient, user?.id, pathname, slug]);

  useEffect(() => {
    if (!activeWorkspace?.id || !localModules) return;

    const currentModule = localModules.find(
      (m) => m.type === "CHAT" && getModuleHref(slug, m) === pathname,
    );

    if (currentModule && currentModule.unreadCount && currentModule.unreadCount > 0) {
      queryClient.setQueryData(
        moduleKeys.list(activeWorkspace.id),
        (old: { data: WorkspaceModule[] } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((m) => (m.id === currentModule.id ? { ...m, unreadCount: 0 } : m)),
          };
        },
      );
    }
  }, [pathname, localModules, activeWorkspace?.id, queryClient, slug]);

  const { activeId, sensors, handleDragStart, handleDragOver, handleDragEnd } = useModuleDnd(
    localModules,
    setLocalModules,
    activeWorkspace?.id,
    reorderModules
  );

  const modules = getModules(slug);

  const searchQueryLower = searchQuery.toLowerCase();
  const filteredModules = modules.filter(m => m.name.toLowerCase().includes(searchQueryLower));
  const filteredLocalModules = localModules?.filter(m => m.name.toLowerCase().includes(searchQueryLower));
  const sharedModules = filteredLocalModules?.filter(m => m.project_id === null) || [];

  const modalQueryLower = modalSearchQuery.toLowerCase();
  const modalFilteredGlobal = modules.filter(m => m.name.toLowerCase().includes(modalQueryLower));
  const modalFilteredLocal = localModules?.filter(m => m.name.toLowerCase().includes(modalQueryLower)) || [];

  useHotkey(["ctrl", "1"], () => router.push(`/${slug}`));
  useHotkey(["ctrl", "2"], () => router.push(`/${slug}/statistics`));

  useHotkey(["ctrl", "k"], (e) => {
    e.preventDefault();
    if (!open) {
      setSearchModalOpen(true);
    } else {
      setTimeout(
        () => {
          searchRef.current?.focus();
        },
        0,
      );
    }
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

  const { open: rOpen, setOpen: setROpen } = useRSidebar();

  useEffect(() => {
    if (isMobile && open) {
      setROpen(false);
    }
  }, [isMobile, open, setROpen]);

  return (
    <>
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence>
          {isMobile && open && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        <m.aside
          variants={sidebarVariants}
          animate={isMobile ? "mobile" : "desktop"}
          transition={spring}
          className={cn(
            "flex flex-col gap-4 h-screen p-4 bg-base-100 border-r border-base-200 z-100",
            isMobile ? "fixed left-0 top-0 shadow-2xl" : "sticky top-0",
          )}
        >
          <div className="flex items-center">
            {/* WORKSPACE */}
            <SidebarWorkspace extended={open} />
          </div>

          {/* SEARCH BAR */}
          {open ? (
            <m.div
              key="search-input"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={fading}
              className="w-full"
            >
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            </m.div>
          ) : (
            <m.div
              key="search-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center cursor-pointer hover:bg-base-200 rounded-lg transition-colors py-2"
              onClick={() => setSearchModalOpen(true)}
            >
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.75}
                className="size-4.5 text-foreground"
              />
            </m.div>
          )}

          {/* GLOBAL MODULES */}
          <div className="flex flex-col">
            {filteredModules.map((module) => (
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

          {/* MODULES & PROJECTS WITH SHARED DND CONTEXT */}
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {(!searchQuery || sharedModules.length > 0) && (
                <div className="flex flex-col shrink-0">
                  <SectionHeader
                    label="Shared"
                    extended={open}
                    onAdd={() => {
                      setAddModuleProjectId(undefined);
                      setAddModuleOpen(true);
                    }}
                  />
                  <SidebarDroppable id="shared" className="flex flex-col min-h-[10px]">
                    <SortableContext
                      items={sharedModules.map((m) => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sharedModules.length > 0 ? (
                        sharedModules.map((mod) => (
                          <SidebarModule
                            key={mod.id}
                            id={mod.id}
                            activeWorkspaceId={activeWorkspace!.id}
                            icon={getModuleIcon(mod.type)}
                            name={mod.name}
                            href={getModuleHref(slug, mod)}
                            active={isModuleActive(pathname, slug, mod)}
                            extended={open}
                            unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                            isPinned={mod.isPinned}
                          />
                        ))
                      ) : (
                        <SidebarNoModule message="No modules yet." extended={open} />
                      )}
                    </SortableContext>
                  </SidebarDroppable>
                </div>
              )}

              {/* DIVIDER */}
              <div className="h-px w-full bg-base-200 rounded-full my-4 shrink-0" />

              {/* PROJECTS */}
              <div className="flex flex-col pb-4">
                <SectionHeader 
                  label="Projects" 
                  extended={open} 
                  onAdd={handleCreateProject} 
                />
                {projects?.map((project: WorkspaceProject) => {
                  const projectModules = filteredLocalModules?.filter(m => m.project_id === project.id) || [];
                  if (searchQuery && projectModules.length === 0) return null;
                  const isActiveContext = projectModules.some(m => isModuleActive(pathname, slug, m));
                  
                  return (
                    <SidebarProject 
                      key={project.id} 
                      project={project} 
                      activeWorkspaceId={activeWorkspace!.id}
                      extended={open}
                      isActiveContext={isActiveContext}
                      isNewlyCreated={editingProjectId === project.id}
                      onEditComplete={() => {
                        if (editingProjectId === project.id) setEditingProjectId(null);
                      }}
                      onAddModule={() => {
                        setAddModuleProjectId(project.id);
                        setAddModuleOpen(true);
                      }}
                    >
                      <SortableContext
                        items={projectModules.map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {projectModules.length > 0 ? (
                          projectModules.map((mod) => (
                            <SidebarModule
                              key={mod.id}
                              id={mod.id}
                              activeWorkspaceId={activeWorkspace!.id}
                              icon={getModuleIcon(mod.type)}
                              name={mod.name}
                              href={getModuleHref(slug, mod)}
                              active={isModuleActive(pathname, slug, mod)}
                              extended={open}
                              unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                              isPinned={mod.isPinned}
                            />
                          ))
                        ) : (
                          <SidebarNoModule message="Empty project" extended={open} />
                        )}
                      </SortableContext>
                    </SidebarProject>
                  );
                })}
              </div>

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
                        unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                        isPinned={mod.isPinned}
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
            projectId={addModuleProjectId}
          />

          {/* PROFILE */}
          <SidebarProfile
            status={status}
            setStatus={handleStatusChange}
            extended={open}
          />
        </m.aside>

        <m.div
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
        </m.div>
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden bg-base-100" showCloseButton={false}>
          <div className="flex items-center px-4 border-b border-base-200">
            <HugeiconsIcon icon={Search01Icon} className="mr-2 size-4 text-muted-foreground shrink-0" />
            <Input
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              placeholder="Search modules..."
              className="flex-1 focus-within:ring-0 focus-within:border-transparent border-0 px-0 shadow-none bg-transparent text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col">
            {modalFilteredGlobal.length === 0 && modalFilteredLocal.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No modules found.</p>
            )}
            
            {modalFilteredGlobal.map((module) => (
              <div key={module.name} onClick={() => setSearchModalOpen(false)}>
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

            {modalFilteredGlobal.length > 0 && modalFilteredLocal.length > 0 && (
              <div className="h-px w-full bg-base-200 rounded-full my-2 shrink-0" />
            )}

            {modalFilteredLocal.map((mod) => (
              <div key={mod.id} onClick={() => setSearchModalOpen(false)}>
                <SidebarModule
                  id={mod.id}
                  activeWorkspaceId={activeWorkspace?.id || ""}
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
      </LazyMotion>
    </>
  );
}