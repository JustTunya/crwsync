"use client";

import { useState } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Home03Icon, TaskDone01Icon, Calendar03Icon, Search01Icon, Add01Icon, ZapIcon, Menu05Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/user-avatar";
import WorkspaceAvatar from "@/components/workspace-avatar";
import ProjectAvatar from "@/components/project-avatar";
import { cn } from "@/lib/utils";

const spring: Transition= { type: "spring", stiffness: 300, damping: 30 };

export default function Sidebar() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <motion.aside
        animate={{ width: open ? 280 : 80 }}
        transition={spring}
        className={cn(
          "flex flex-col gap-4 h-screen p-4 bg-base-100 border-r border-base-200 overflow-hidden",
          !open && "items-center"
        )}
      >
        <div className="flex items-center">
          {/* WORKSPACE */}
          <SidebarWorkspace extended={open} />

          <AnimatePresence mode="wait">
            {open && (
              <>
                {/* DIVIDER */}
                <div className="h-full w-px bg-base-200 rounded-full mx-4"/>

                {/* TOGGLE BUTTON */}
                <HugeiconsIcon
                  icon={Menu05Icon}
                  className="size-5 text-foreground cursor-pointer"
                  onClick={() => setOpen(!open)}
                />
              </>
            )}
          </AnimatePresence>
        </div>

        {/* SEARCH BAR */}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="w-full"
            >
              <Input 
                placeholder="Search..."
                className="bg-base-200" 
                prefix={<HugeiconsIcon icon={Search01Icon} className="size-4 text-placeholder" />}
              />
            </motion.div>
          ) : (
            <HugeiconsIcon icon={Search01Icon} className="size-5 text-foreground my-2" />
          )}
        </AnimatePresence>

        {/* MODULES */}
        <div className="flex flex-col">
          <SidebarModule icon={Home03Icon} name="Home" active extended={open} />
          <SidebarModule icon={TaskDone01Icon} name="Tasks" extended={open} />
          <SidebarModule icon={Calendar03Icon} name="Calendar" extended={open} />
        </div>

        {/* DIVIDER */}
        <div className="h-px w-full bg-base-200 rounded-full my-2"/>

        {/* SHARED */}
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: "1rem" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="flex items-center justify-between overflow-hidden"
              >
                <p className="text-xs text-muted-foreground">Shared</p>
                <HugeiconsIcon icon={Add01Icon} className="size-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
              </motion.div>
            )}
          </AnimatePresence>

          <SidebarNoModule message="No shared modules yet." extended={open} />
        </div>

        {/* DIVIDER */}
        <div className="h-px w-full bg-base-200 rounded-full my-2"/>

        {/* PROJECTS */}
        <div>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: "1rem" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="flex items-center justify-between overflow-hidden"
              >
                <p className="text-xs text-muted-foreground">Projects</p>
                <HugeiconsIcon icon={Add01Icon} className="size-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
              </motion.div>
            )}
          </AnimatePresence>

        <SidebarProject icon={ZapIcon} name="Demo project" extended={open} />
        </div>

        {/* PROFILE */}
        <SidebarProfile extended={open} />
      </motion.aside>

      {!open && (
        <HugeiconsIcon
          icon={Menu05Icon}
          className="size-5 m-4 text-foreground cursor-pointer"
          onClick={() => setOpen(!open)}
        />
      )}
    </>
  );
}

export function SidebarWorkspace({ extended }: { extended?: boolean }) {
  const logo = "";
  const name = "My Workspace";

  return (
    <div className="flex-1 flex flex-row items-center gap-2 cursor-pointer">
      <WorkspaceAvatar avatar_key={logo} name={name} />
      
      <AnimatePresence>
        {extended && (
          <motion.p 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="text-foreground text-sm font-medium whitespace-nowrap"
          >
            {name}
          </motion.p>
        )}
      </AnimatePresence>

      {extended && (
        <div className="ml-auto flex flex-col -space-y-1">
          <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
        </div>
      )}
      
    </div>
  );
}

export function SidebarModule({ icon, name, active, extended }: { icon: HugeiconsIconProps["icon"]; name?: string; active?: boolean; extended?: boolean }) {
  return (
    <div className={cn(
      "relative flex flex-row items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors overflow-hidden",
      active && "bg-base-200"
    )}>
      <HugeiconsIcon icon={icon} className="size-5" />
      <AnimatePresence>
        {extended && (
          <motion.p 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="text-foreground text-sm font-medium whitespace-nowrap"
          >
            {name}
          </motion.p>
        )}
      </AnimatePresence>

      {active && (<div className="absolute inset-0 w-2/3 ml-auto rounded-r-lg bg-linear-to-l from-primary/25 to-transparent" />)}
      {active && (<div className="absolute inset-0 w-1 my-2 ml-auto rounded-lg bg-primary" />)}
    </div>
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
    <div className="flex flex-row items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
      <ProjectAvatar icon={icon} />
      <AnimatePresence>
        {extended && (
          <motion.p 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="text-foreground text-sm font-medium whitespace-nowrap"
          >
            {name}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarProfile({ extended }: { extended?: boolean }) {
  const user = useUser();

  return (
    <div className={cn("mt-auto cursor-pointer flex-nowrap flex flex-row items-center", extended ? "gap-3 px-4 py-2 rounded-lg bg-base-200 shadow-md" : "mb-3")}>
      <UserAvatar user={user} key={"user-avatar"} status="online" />

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
            <p className="text-muted-foreground text-xs whitespace-nowrap">{user?.email}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {extended && (
        <div className="ml-auto flex flex-col -space-y-1">
          <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
        </div>
      )}
    </div>
  );
}