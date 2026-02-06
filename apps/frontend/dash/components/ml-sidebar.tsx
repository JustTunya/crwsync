"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion, Transition } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMlSidebar } from "@/hooks/use-ml-sidebar";
import { WorkspaceUser } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { getWorkspaceMembers } from "@/services/workspace.service";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

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
  const { socket, isConnected } = useSocket();

  const { open, toggleOpen } = useMlSidebar();

  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["ws-members", workspace?.id],
    queryFn: () => getWorkspaceMembers(workspace!.id),
    enabled: !!workspace?.id,
  });

  useEffect(() => {
    if (!socket || !workspace?.id || !isConnected) return;

    socket.emit("sub_ws", workspace.id);

    const handleStatusUpdate = ({ userId, status }: { userId: string; status: UserStatus }) => {
      setStatuses((prev) => ({ ...prev, [userId]: status }));
    };

    const handleWorkspaceStatuses = (initialStatuses: Record<string, UserStatus>) => {
      setStatuses(initialStatuses);
    };

    socket.on("status:update", handleStatusUpdate);
    socket.on("ws_statuses", handleWorkspaceStatuses);

    return () => {
      socket.off("status:update", handleStatusUpdate);
      socket.off("ws_statuses", handleWorkspaceStatuses);
    };
  }, [socket, workspace?.id, isConnected]);

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
        className="flex flex-col gap-4 h-screen bg-base-100 border-r border-base-200 overflow-hidden"
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-gray-500">Loading members...</span>
          </div>
        ) : (
          <div className={cn("flex-1 overflow-y-auto", open ? "px-4 py-5" : "p-0")}>
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
                        status={statuses[member.user_id] || "OFFLINE"} 
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-row items-center justify-center w-full p-2 mt-auto bg-red-50"></div>
      </motion.aside>
    </>
  );
}

type UserStatus = "ONLINE" | "OFFLINE" | "BUSY" | "AWAY";

interface SidebarProfileProps {
  user: WorkspaceUser | undefined;
  status: UserStatus;
}

export function SidebarProfile({ user, status }: SidebarProfileProps) {
  const profRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={profRef}
      className="relative flex flex-col items-center hover:bg-base-300/75 transition-colors cursor-pointer"
    >
      <div className="px-2 flex-nowrap flex flex-row items-center gap-3 w-full">
        <div className="relative">
          <UserAvatar user={user} status={status.toLowerCase()} key={"user-avatar"} />
        </div>

        <div className="flex flex-col">
          <p className="text-foreground text-sm whitespace-nowrap">{user?.lastname} {user?.firstname}</p>
          <p className="text-muted-foreground text-xs whitespace-nowrap h-4 flex items-center truncate">{user?.username}</p>
        </div>
      </div>
    </div>
  );
}