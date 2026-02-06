"use client";

import { useMemo, useRef, useState } from "react";
import { motion, Transition } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/workspace.provider";
import { getWorkspaceMembers } from "@/services/workspace.service";
import { useOutclick } from "@/hooks/use-outclick";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { WorkspaceUser } from "@crwsync/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { useMlSidebar } from "@/hooks/use-ml-sidebar";

//! TODO: Use enum from packages/types
export enum WorkspaceRoleEnum {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  GUEST = "guest",
}

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };

export function MlSidebar() {
  const { activeWorkspace: workspace } = useWorkspace();

  const { open, toggleOpen } = useMlSidebar();

  const { data, isLoading } = useQuery({
    queryKey: ["ws-members", workspace?.id],
    queryFn: () => getWorkspaceMembers(workspace!.id),
    enabled: !!workspace?.id,
  });

  const groupedMembers = useMemo(() => {
    if (!data?.data) return [];

    const ROLES_ORDER: WorkspaceRoleEnum[] = [
      WorkspaceRoleEnum.OWNER,
      WorkspaceRoleEnum.ADMIN,
      WorkspaceRoleEnum.MEMBER,
      WorkspaceRoleEnum.GUEST,
    ];

    const members = data.data;

    const groups = ROLES_ORDER.map((role) => {
      const mems = members
        .filter((m) => m.role.toLocaleLowerCase() === role)
        .sort((a, b) => {
          const nameA = `${a.user?.firstname} ${a.user?.lastname}`.toLowerCase();
          const nameB = `${b.user?.firstname} ${b.user?.lastname}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      return { role, members: mems };
    });

    return groups;
  }, [data]);

  return (
    <>
      <div className="flex items-center justify-center size-8 m-4 rounded-full hover:bg-base-300/75 transition-colors cursor-pointer">
        <HugeiconsIcon onClick={toggleOpen} icon={UserMultiple02Icon} strokeWidth={2} className="size-5" />
      </div>

      <motion.aside
        animate={{ width: open ? 240 : 0 }}
        transition={spring}
        className={cn("flex flex-col gap-4 h-screen bg-base-100 border-r border-base-200 overflow-hidden", open ? "px-4 py-5" : "p-0")}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-gray-500">Loading members...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {groupedMembers.map((group) => {
              if (group.members.length === 0) return null;
              
              return(
                <div key={group.role} className="mb-6">
                  <p className="mb-2 text-xs text-muted-foreground uppercase">
                    {group.role} ({group.members.length})
                  </p>
                  <ul>
                    {group.members.map((member) => (
                      <SidebarProfile 
                        key={member.id} 
                        user={member.user}
                        status="online" //! TODO: Add real status
                        extended={true}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </motion.aside>
    </>
  );
}

type UserStatus = "online" | "offline" | "busy" | "away";

export function SidebarProfile({ user, status, extended }: { user: WorkspaceUser | undefined; status: UserStatus; extended?: boolean }) {
  const profRef = useRef<HTMLDivElement>(null);

  const [openMenu, setOpenMenu] = useState(false);

  useOutclick(profRef, () => {
    setOpenMenu(false);
  }, openMenu);

  return (
    <div 
      ref={profRef}
      className={cn(
        "mt-auto cursor-pointer flex flex-col items-center",
        extended && [
          "py-2 px-1 rounded-lg",
          !openMenu && "hover:bg-base-300/75 transition-colors"
        ],
        !extended && "mb-3"
      )}
    >
      <div className="px-2 flex-nowrap flex flex-row items-center gap-3 w-full">
        <UserAvatar user={user} key={"user-avatar"} status={status} />

        {extended && (
          <div className="flex flex-col">
            <p className="text-foreground text-sm whitespace-nowrap">{user?.lastname} {user?.firstname}</p>
            <p className="text-muted-foreground text-xs whitespace-nowrap h-4 flex items-center truncate">{user?.username}</p>
          </div>
        )}
      </div>
    </div>
  );
}