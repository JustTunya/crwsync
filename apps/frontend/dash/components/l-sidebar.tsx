"use client";

import Link from "next/link";
import { useState, useRef, useTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Home03Icon,
  Task01Icon,
  Calendar03Icon,
  Search01Icon,
  Add01Icon,
  ZapIcon,
  Menu05Icon,
  ArrowRight01Icon,
  Settings02Icon,
  Logout02Icon,
  Tick02Icon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";
import { WorkspaceModule } from "@crwsync/types";
import { useWorkspace } from "@/providers/workspace.provider";
import { useUser } from "@/providers/user.provider";
import { useSocket } from "@/providers/socket.provider";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { ProjectAvatar } from "@/components/project-avatar";
import { UserAvatar } from "@/components/user-avatar";
import AddModuleModal from "@/components/add-module-modal";
import { Input } from "@/components/ui/input";
import { Shortcut } from "@/components/ui/shortcut";
import { useOutclick } from "@/hooks/use-outclick";
import { useLSidebar } from "@/hooks/use-l-sidebar";
import { useWorkspaceModules } from "@/hooks/use-workspace-modules";
import { useHotkey } from "@/hooks/use-hotkey";
import { signout } from "@/services/auth.service";
import { cn } from "@/lib/utils";

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
const fading: Transition = { duration: 0.15, ease: [0.4, 0, 0.2, 1] };

type UserStatus = "online" | "offline" | "busy" | "away";

enum ModuleTypeEnum {
  BOARD = "BOARD",
}

export function LSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  const { activeWorkspace } = useWorkspace();
  const { open, toggleOpen } = useLSidebar();
  const { socket } = useSocket();
  const user = useUser();

  const [status, setStatus] = useState<UserStatus>(
    (user?.status_preference?.toLowerCase() as UserStatus) || "online",
  );

  useEffect(() => {
    if (!socket || !user) return;

    const handleStatusUpdate = ({
      userId,
      status: newStatus,
    }: {
      userId: string;
      status: string;
    }) => {
      if (userId === user.id) {
        setStatus(newStatus.toLowerCase() as UserStatus);
      }
    };

    socket.on("status:update", handleStatusUpdate);

    return () => {
      socket.off("status:update", handleStatusUpdate);
    };
  }, [socket, user]);

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    if (socket) {
      socket.emit("update_status", newStatus.toUpperCase());
    }
  };

  const slug = activeWorkspace?.slug || "";
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const { data: wsModules } = useWorkspaceModules(activeWorkspace?.id);

  const modules = [
    {
      name: "Home",
      icon: Home03Icon,
      href: `/${slug}`,
      shortcut: ["ctrl", "1"],
    },
    {
      name: "Tasks",
      icon: Task01Icon,
      href: `/${slug}/tasks`,
      shortcut: ["ctrl", "2"],
    },
    {
      name: "Schedule",
      icon: Calendar03Icon,
      href: `/${slug}/schedule`,
      shortcut: ["ctrl", "3"],
    },
  ];

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

        {/* MODULES */}
        <div className="flex flex-col">
          {modules.map((module) => (
            <SidebarModule
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
          {wsModules && wsModules.length > 0 ? (
            wsModules.map((mod) => (
              <SidebarModule
                key={mod.id}
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
        animate={{ left: open ? 296 : 96 }}
        className="absolute top-4 flex items-center justify-center size-8 rounded-full hover:bg-base-300/75 transition-colors cursor-pointer z-50"
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

function getModuleIcon(type: ModuleTypeEnum): HugeiconsIconProps["icon"] {
  switch (type) {
    case ModuleTypeEnum.BOARD:
      return DashboardSquare01Icon;
    default:
      return DashboardSquare01Icon;
  }
}

function getModuleHref(slug: string, mod: WorkspaceModule): string {
  switch (mod.type) {
    case ModuleTypeEnum.BOARD:
      return `/${slug}/board/${mod.reference_id}`;
    default:
      return `/${slug}`;
  }
}

function isModuleActive(
  pathname: string,
  slug: string,
  mod: WorkspaceModule,
): boolean {
  switch (mod.type) {
    case ModuleTypeEnum.BOARD:
      return pathname === `/${slug}/board/${mod.reference_id}`;
    default:
      return false;
  }
}

export function SectionHeader({
  label,
  extended,
  onAdd,
}: {
  label: string;
  extended: boolean;
  onAdd?: () => void;
}) {
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
          <HugeiconsIcon
            icon={Add01Icon}
            className="size-4 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onAdd}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SidebarToggle({
  toggleOpen,
  className,
}: {
  toggleOpen: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-1 rounded-full hover:bg-base-200 transition-colors cursor-pointer",
        className,
      )}
      onClick={toggleOpen}
    >
      <HugeiconsIcon icon={Menu05Icon} className="size-5 text-foreground" />
    </div>
  );
}

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
        <div
          onClick={toggleMenu}
          className={cn(
            "flex flex-row items-center gap-3 h-10 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
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
        </div>
      ) : (
        <div
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
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Workspaces
            </p>

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
                  </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarModule({
  icon,
  name,
  href,
  shortcut,
  active,
  extended,
}: {
  icon: HugeiconsIconProps["icon"];
  name: string;
  href: string;
  shortcut?: string[];
  active?: boolean;
  extended?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-row items-center justify-between gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors overflow-hidden",
        !extended && "justify-center",
      )}
    >
      <div className="flex flex-row items-center gap-2">
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
              className="text-foreground text-xs font-medium whitespace-nowrap z-10"
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

export function SidebarProject({
  icon,
  name,
  extended,
}: {
  icon: HugeiconsIconProps["icon"];
  name?: string;
  extended?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
        !extended && "justify-center",
      )}
    >
      <ProjectAvatar icon={icon} />
      {extended && (
        <p className="text-foreground text-xs font-medium whitespace-nowrap">
          {name}
        </p>
      )}
    </div>
  );
}

const STATUS_META: Record<UserStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "bg-green-500" },
  offline: { label: "Offline", color: "bg-gray-400" },
  busy: { label: "Busy", color: "bg-red-500" },
  away: { label: "Away", color: "bg-yellow-500" },
};

export function SidebarProfile({
  status,
  setStatus,
  extended,
}: {
  status: UserStatus;
  setStatus: (status: UserStatus) => void;
  extended?: boolean;
}) {
  const user = useUser();
  const profRef = useRef<HTMLDivElement>(null);

  const [pending, start] = useTransition();
  const [openMenu, setOpenMenu] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useOutclick(
    profRef,
    () => {
      setOpenMenu(false);
      setEditStatus(false);
    },
    openMenu,
  );

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
          !openMenu && "hover:bg-base-300/75 transition-colors",
        ],
        !extended && "mb-3",
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
              <p className="text-foreground text-sm leading-tight whitespace-nowrap">
                {user?.firstname} {user?.lastname}
              </p>

              <div className="relative h-4 w-full overflow-hidden">
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: isHovered ? "-50%" : "0%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex flex-col"
                >
                  <p className="text-muted-foreground text-xs leading-0 whitespace-nowrap h-4 flex items-center truncate">
                    {user?.email}
                  </p>
                  <p className="text-muted-foreground text-xs leading-0 whitespace-nowrap h-4 flex items-center truncate">
                    {user?.username}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {extended && (
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
                      onClick={() => {
                        setStatus(s as UserStatus);
                        setEditStatus(false);
                      }}
                    />
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

                  <MenuLink
                    href={`/settings`}
                    icon={Settings02Icon}
                    label="Settings"
                  />

                  <button
                    onClick={handleSignout}
                    disabled={pending}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <HugeiconsIcon icon={Logout02Icon} className="size-4" />
                    <p className="text-sm font-light">
                      {pending ? "Signing out..." : "Sign Out"}
                    </p>
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

export function StatusItem({
  label,
  status,
  onClick,
  asContainer,
}: {
  label: string;
  status: UserStatus;
  onClick?: () => void;
  asContainer?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-2">
      <div
        className={cn("size-3 mx-0.5 rounded-full", STATUS_META[status].color)}
      />
      <p className="text-sm font-light capitalize">{label}</p>
    </div>
  );

  if (asContainer) return content;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
    >
      {content}
    </div>
  );
}

export function MenuLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: HugeiconsIconProps["icon"];
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-300 transition-colors"
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      <p className="text-sm font-light">{label}</p>
    </Link>
  );
}
