"use client";

import Link from "next/link";
import { useState, useRef, useTransition } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Home03Icon, TaskDone01Icon, Calendar03Icon, Search01Icon, Add01Icon, ZapIcon, Menu05Icon, ArrowRight01Icon, Settings02Icon, Logout02Icon, InboxIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { useUser } from "@/providers/user.provider";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { ProjectAvatar } from "@/components/project-avatar";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { useOutclick } from "@/hooks/use-outclick";
import { useSidebar } from "@/hooks/use-sidebar";
import { signout } from "@/services/auth.service";
import { cn } from "@/lib/utils";

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
const fading: Transition = { duration: 0.15, ease: [0.4, 0, 0.2, 1] };

export function Sidebar() {
  const [status, setStatus] = useState<"online" | "offline" | "busy" | "away">("online");

  const { open, toggleOpen } = useSidebar();
  const pathname = usePathname();

  const { activeWorkspace } = useWorkspace();
  const slug = activeWorkspace?.slug || "";

  const modules = [
    { name: "Home", icon: Home03Icon, href: `/${slug}` },
    { name: "Inbox", icon: InboxIcon, href: `/${slug}/inbox` },
    { name: "Tasks", icon: TaskDone01Icon, href: `/${slug}/tasks` },
    { name: "Calendar", icon: Calendar03Icon, href: `/${slug}/calendar` },
  ];

  return (
    <>
      <motion.aside
        animate={{ width: open ? 280 : 80 }}
        transition={spring}
        className="flex flex-col gap-4 h-screen p-4 bg-base-100 border-r border-base-200 overflow-hidden"
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
              placeholder="Search..."
              className="bg-base-200" 
              prefix={<HugeiconsIcon icon={Search01Icon} strokeWidth={1.75} className="size-4 text-placeholder" />}
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
            <HugeiconsIcon icon={Search01Icon} strokeWidth={1.75} className="size-4.5 text-foreground my-2" />
          </motion.div>
        )}

        {/* MODULES */}
        <div className="flex flex-col">
          {modules.map((module) => (
            <SidebarModule 
              key={module.name}
              icon={module.icon}
              name={module.name}
              href={module.href}
              active={pathname === module.href}
              extended={open}
            />
          ))}
        </div>

        {/* DIVIDER */}
        <div className="h-px w-full bg-base-200 rounded-full"/>

        {/* SHARED */}
        <div className="flex flex-col">
          <SectionHeader label="Shared" extended={open} />
          <SidebarNoModule message="No shared modules yet." extended={open} />
        </div>

        {/* DIVIDER */}
        <div className="h-px w-full bg-base-200 rounded-full"/>

        {/* PROJECTS */}
        <div className="flex flex-col">
          <SectionHeader label="Projects" extended={open} />
          <SidebarProject icon={ZapIcon} name="Demo project" extended={open} />
        </div>

        {/* PROFILE */}
        <SidebarProfile status={status} setStatus={setStatus} extended={open} />
      </motion.aside>

      {!open && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <SidebarToggle toggleOpen={toggleOpen} className="size-7 my-5 mx-3" />
        </motion.div>
      )}
    </>
  );
}

export function SectionHeader({ label, extended }: { label: string; extended: boolean }) {
  return (
    <AnimatePresence>
      {extended && (
        <motion.div 
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: "0.5rem" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="flex items-center justify-between overflow-hidden px-2"
        >
          <p className="text-xs text-muted-foreground">{label}</p>
          <HugeiconsIcon icon={Add01Icon} className="size-4 text-muted-foreground hover:text-foreground cursor-pointer" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SidebarToggle({ toggleOpen, className }: { toggleOpen: () => void; className?: string }) {
  return (
    <div className={cn("p-1 rounded-full hover:bg-base-200 transition-colors cursor-pointer", className)} onClick={toggleOpen}>
      <HugeiconsIcon icon={Menu05Icon} className="size-5 text-foreground"/>
    </div>
  );
}

export function SidebarWorkspace({ extended }: { extended?: boolean }) {
  const { activeWorkspace, workspaces, switchWorkspace, loading } = useWorkspace();
  
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
        <div
          onClick={toggleMenu}
          className={cn(
            "flex flex-row items-center gap-3 h-10 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
            !extended && "justify-center"
          )}
        >
          <WorkspaceAvatar avatar_key={activeWorkspace.logo_key || ""} name={activeWorkspace.name} />

          {extended && (
            <div className="flex items-center flex-1 overflow-hidden">
              <p className="text-foreground text-sm font-semibold truncate">{activeWorkspace.name}</p>

              <div className="ml-auto flex flex-col -space-y-1">
                <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-3.5" />
                <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3.5" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={toggleMenu}
          className={cn(
            "flex flex-row items-center gap-3 h-10 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
            !extended && "justify-center"
          )}
        >
          <div className="size-6 rounded-sm border-[1.5px] border-dashed border-base-300" />

          {extended && (
            <div className="flex items-center flex-1 overflow-hidden">
              <p className="text-base-300 text-sm truncate">No Workspace</p>

              <div className="ml-auto flex flex-col -space-y-1">
                <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-3.5" />
                <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3.5" />
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {extended && openWorkspaces && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={spring}
            className="absolute top-12 left-0 z-50 flex flex-col w-full p-2 bg-base-100 border border-base-200 rounded-xl shadow-xl"
          >
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Workspaces</p>
            
            <div className="flex flex-col gap-1 mb-2 max-h-48 overflow-y-auto">
              {workspaces.map((member) => {
                const ws = member.workspace;
                const isActive = ws?.id === activeWorkspace?.id;
                if (!ws) return null;

                return (
                  <div 
                    key={ws.id}
                    onClick={() => handleSwitch(ws.slug)}
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
                      isActive && "bg-base-200"
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <WorkspaceAvatar avatar_key={ws.logo_key || ""} name={ws.name} className="size-5 text-[10px]" />
                      <p className="text-xs font-medium truncate">{ws.name}</p>
                    </div>
                    {isActive && (
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4.5 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-px w-full bg-base-200 my-2" />

            <Link href="/create-workspace" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 transition-colors text-left cursor-pointer group">
                <HugeiconsIcon icon={Add01Icon} className="size-4 text-muted-foreground group-hover:text-foreground" />
                <p className="text-sm font-light text-muted-foreground group-hover:text-foreground">Create Workspace</p>
            </Link>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarModule({ icon, name, href, active, extended }: { icon: HugeiconsIconProps["icon"]; name: string; href: string; active?: boolean; extended?: boolean }) {
  return (
    <Link href={href} className={cn("relative flex flex-row items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors overflow-hidden", !extended && "justify-center")}>
      <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-4.5 z-10" />
      <AnimatePresence>
        {extended && (
          <motion.p 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="text-foreground text-xs font-medium whitespace-nowrap z-10"
          >
            {name}
          </motion.p>
        )}
      </AnimatePresence>
      
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
  
export function SidebarNoModule({ message, extended }: { message?: string; extended?: boolean }) {
  return (
    <motion.div 
      animate={{ 
        width: extended ? "100%" : "0",
        padding: extended ? "4px" : "8px"
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

export function SidebarProject({ icon, name, extended }: { icon: HugeiconsIconProps["icon"]; name?: string; extended?: boolean }) {
  return (
    <div className={cn("flex flex-row items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors", !extended && "justify-center")}>
      <ProjectAvatar icon={icon} />
        {extended && (
          <p className="text-foreground text-xs font-medium whitespace-nowrap">{name}</p>
        )}
    </div>
  );
}

type UserStatus = "online" | "offline" | "busy" | "away";

const STATUS_META: Record<UserStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "bg-green-500" },
  offline:{ label: "Offline", color: "bg-gray-400" },
  busy:   { label: "Busy",   color: "bg-red-500" },
  away:   { label: "Away",   color: "bg-yellow-500" },
};

export function SidebarProfile({ status, setStatus, extended }: { status: UserStatus; setStatus: (status: UserStatus) => void; extended?: boolean }) {
  const user = useUser();
  const { activeWorkspace } = useWorkspace();
  const slug = activeWorkspace?.slug || "";
  const profRef = useRef<HTMLDivElement>(null);

  const [pending, start] = useTransition();
  const [openMenu, setOpenMenu] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useOutclick(profRef, () => {
    setOpenMenu(false);
    setEditStatus(false);
  }, openMenu);

  const handleSignout = () => {
    if (pending) return;

    start(async () => {
      await signout();
      window.location.assign(process.env.NEXT_PUBLIC_WEB_URL!);
    });
  };

  const handleMenuToggle = () => {
    setOpenMenu(!openMenu);
    setEditStatus(false);
  };

  return (
    <div 
      ref={profRef}
      onClick={handleMenuToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "mt-auto cursor-pointer flex flex-col items-center",
        extended && [
          "p-2 rounded-lg bg-base-200 shadow-md",
          !openMenu && "hover:bg-base-300/75 transition-colors"
        ],
        !extended && "mb-3"
      )}
    >
      <div className="px-2 flex-nowrap flex flex-row items-center gap-3 w-full">
        <UserAvatar user={user} key={"user-avatar"} status={status} />

        <AnimatePresence>
          {extended && (
            <motion.div
              key={"user-info"}
              initial={{ opacity: 0, width: 0 }} 
              animate={{ opacity: 1, width: "auto" }} 
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="flex flex-col"
            >
              <p className="text-foreground text-sm whitespace-nowrap">{user?.lastname} {user?.firstname}</p>
              
              <div className="relative h-4 w-full overflow-hidden">
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: isHovered ? "-50%" : "0%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex flex-col"
                >
                  <p className="text-muted-foreground text-xs whitespace-nowrap h-4 flex items-center truncate">
                    {user?.email}
                  </p>
                  <p className="text-muted-foreground text-xs whitespace-nowrap h-4 flex items-center truncate">
                    @{user?.username}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {extended && (
          <div className="ml-auto flex flex-col -space-y-1">
            <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-3.5" />
            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3.5" />
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {extended && openMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="w-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full h-0.5 bg-base-300 rounded-full mb-2 mt-4" />

            <AnimatePresence mode="wait" initial={false}>
              {editStatus ? (
                <motion.div
                  key="edit-mode"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  {["online", "busy", "away"].map((s) => (
                    <StatusItem 
                      key={s}
                      label={s}
                      status={s as UserStatus}
                      onClick={() => { setStatus(s as UserStatus); setEditStatus(false); }} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="menu-mode"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  <div 
                    onClick={() => setEditStatus(true)} 
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                  >
                    <StatusItem label={status} status={status} asContainer />
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
                  </div>

                  <MenuLink href={`/${slug}/settings`} icon={Settings02Icon} label="Settings" />

                  <button
                    onClick={handleSignout}
                    disabled={pending}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <HugeiconsIcon icon={Logout02Icon} className="size-4" />
                    <p className="text-sm font-light">{pending ? "Signing out..." : "Sign Out"}</p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StatusItem({ label, status, onClick, asContainer }: { label: string; status: UserStatus; onClick?: () => void; asContainer?: boolean }) {
  const content = (
    <div className="flex items-center gap-2">
      <div className={cn("size-3 mx-0.5 rounded-full", STATUS_META[status].color)} />
      <p className="text-sm font-light capitalize">{label}</p>
    </div>
  );

  if (asContainer) return content;

  return (
    <div onClick={onClick} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
      {content}
    </div>
  );
}

export function MenuLink({ href, icon, label }: { href: string; icon: HugeiconsIconProps["icon"]; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors">
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      <p className="text-sm font-light">{label}</p>
    </Link>
  );
}