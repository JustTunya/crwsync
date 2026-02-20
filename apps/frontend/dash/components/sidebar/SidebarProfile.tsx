import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, Transition } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, ArrowRight01Icon, Settings02Icon, Logout02Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { signout } from "@/services/auth.service";
import { UserAvatar } from "@/components/user-avatar";
import { useOutclick } from "@/hooks/use-outclick";
import { cn } from "@/lib/utils";
import { STATUS_META, UserStatus } from "./sidebar.utils";

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };

interface SidebarProfileProps {
  status: UserStatus;
  setStatus: (status: UserStatus) => void;
  extended?: boolean;
}

export function SidebarProfile({ status, setStatus, extended }: SidebarProfileProps) {
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

interface StatusItemProps {
  label: string;
  status: UserStatus;
  onClick?: () => void;
  asContainer?: boolean;
}

export function StatusItem({ label, status, onClick, asContainer }: StatusItemProps) {
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

interface MenuLinkProps {
  href: string;
  icon: HugeiconsIconProps["icon"];
  label: string;
}

export function MenuLink({ href, icon, label }: MenuLinkProps) {
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
