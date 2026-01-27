"use client";

import { useState } from "react";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Home03Icon, TaskDone01Icon, Calendar03Icon, Search01Icon, Add01Icon, ZapIcon, Menu05Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/user-avatar";
import WorkspaceAvatar from "@/components/workspace-avatar";
import ProjectAvatar from "@/components/project-avatar";

export default function Sidebar() {
  const user = useUser();

  const [open, setOpen] = useState(true);

  return (
    <aside className="flex flex-col gap-4 w-min h-screen p-4 bg-base-100">
      <div className="flex items-center">
        {/* WORKSPACE */}
        <div className="flex-1 flex flex-row items-center gap-2 cursor-pointer">
          <WorkspaceAvatar avatar_key={user?.avatar_key} name={user?.username} />

          <p className="text-foreground text-sm whitespace-nowrap">{user?.username}</p>

          <div className="ml-auto flex flex-col -space-y-1">
            <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
          </div>
        </div>

        {/* DIVIDER */}
        <div className="h-full w-px bg-base-200 rounded-full mx-4"/>

        {/* TOGGLE BUTTON */}
        <HugeiconsIcon
          icon={Menu05Icon}
          className="size-5 text-foreground cursor-pointer"
          onClick={() => setOpen(!open)}
        />
      </div>

      {/* SEARCH BAR */}
      <Input 
        placeholder="Search..."
        className="bg-base-200" 
        prefix={
          <HugeiconsIcon icon={Search01Icon} className="size-4 text-placeholder" />
        }
      />

      {/* PERSONAL */}
      <div>
        <SidebarItem icon={Home03Icon} label="Home" />
        <SidebarItem icon={TaskDone01Icon} label="Tasks" />
        <SidebarItem icon={Calendar03Icon} label="Calendar" />
      </div>

      {/* DIVIDER */}
      <div className="h-px w-full bg-base-200 rounded-full my-2"/>

      {/* SHARED */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">Shared</p>
          <HugeiconsIcon icon={Add01Icon} className="size-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
        </div>

        <SidebarNoItem message="No shared modules yet." />
      </div>

      {/* DIVIDER */}
      <div className="h-px w-full bg-base-200 rounded-full my-2"/>

      {/* PROJECTS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">Projects</p>
          <HugeiconsIcon icon={Add01Icon} className="size-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
        </div>

        <div className="flex flex-row items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
          <ProjectAvatar icon={ZapIcon} />
          <p className="text-foreground text-sm whitespace-nowrap">Demo project</p>
        </div>
      </div>

      {/* PROFILE */}
      <div className="flex flex-row items-center gap-3 mt-auto px-4 py-2 rounded-lg bg-base-200 shadow-md cursor-pointer">
        <UserAvatar user={user} status="online" />

        <div className="flex flex-col">
          <p className="text-foreground text-sm whitespace-nowrap">{user?.lastname} {user?.firstname}</p>
          <p className="text-muted-foreground text-xs whitespace-nowrap">{user?.email}</p>
        </div>

        <div className="ml-auto flex flex-col -space-y-1">
          <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
        </div>
      </div>
    </aside>
  );
}

export function SidebarItem({ icon, label }: { icon: HugeiconsIconProps["icon"]; label: string }) {
  return (
    <div className="flex flex-row items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
      <HugeiconsIcon icon={icon} className="size-4.5" />
      <p className="text-foreground text-sm whitespace-nowrap">{label}</p>
    </div>
  );
}
  
export function SidebarNoItem({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-1.5 rounded-lg border-[1.5px] border-dashed border-base-300">
      <p className="text-muted-foreground text-xs italic">{message ?? "No items available."}</p>
    </div>
  );
}