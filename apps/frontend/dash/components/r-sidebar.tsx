"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { m, Transition, LazyMotion, domAnimation } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AddTeamIcon, UserMultiple02Icon, InboxIcon, Notification01Icon, Door01Icon, Message01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Workspace, WorkspaceMember, WorkspaceUser } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { getWorkspaceMembers, kickWorkspaceMember } from "@/services/workspace.service";
import { useRSidebar } from "@/hooks/use-r-sidebar";
import { useLSidebar } from "@/hooks/use-l-sidebar";
import { UserAvatar } from "@/components/user-avatar";
import InviteMemberModal from "@/components/inv-modal";
import { useInvites } from "@/hooks/use-invites";
import { useMediaQuery } from "@/hooks/use-media-query";
import { InviteNotification } from "@/components/notifications";
import { useUser } from "@/providers/user.provider";

import { cn } from "@/lib/utils";

//! TODO: Use enum from packages/types
export enum WorkspaceRoleEnum {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  GUEST = "GUEST",
}

const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };

export function RSidebar() {
  const { activeWorkspace: workspace } = useWorkspace();
  const { socket, isConnected } = useSocket();

  const { open, toggleOpen, view, setView, setOpen } = useRSidebar();
  const { open: lOpen } = useLSidebar();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [openInviteModal, setOpenInviteModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ws-members", workspace?.id],
    queryFn: () => getWorkspaceMembers(workspace!.id),
    enabled: !!workspace?.id,
  });

  useEffect(() => {
    if (!socket || !workspace?.id || !isConnected) return;

    socket.emit("sub_ws", workspace.id);

    const handleStatusUpdate = ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }) => {
      setStatuses((prev) => ({ ...prev, [userId]: status }));
    };

    const handleWorkspaceStatuses = (
      initialStatuses: Record<string, UserStatus>,
    ) => {
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
        .filter((m) => m.role === role)
        .sort((a, b) => {
          const nameA = `${a.user?.firstname} ${a.user?.lastname}`.toLowerCase();
          const nameB = `${b.user?.firstname} ${b.user?.lastname}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      return { role, members: mems };
    });

    return groups;
  }, [data]);

  const sidebarVariants = {
    desktop: {
      width: open ? (view === "MEMBERS" ? 240 : 360) : 0,
      x: 0,
      position: "relative" as const,
    },
    mobile: {
      width: "100%",
      x: open ? 0 : "100%",
      position: "fixed" as const,
      zIndex: 50,
      right: 0,
    },
  };

  const toggleBtnVariants = {
    desktop: {
      right: open ? (view === "MEMBERS" ? 256 : 376) : 16,
      x: 0,
      opacity: 1,
      pointerEvents: "auto" as const,
    },
    mobile: {
      right: 16,
      x: 0,
      zIndex: 60, 
      opacity: lOpen ? 0 : 1,
      pointerEvents: lOpen ? "none" as const : "auto" as const,
    },
  };

  return (
    <>
      <LazyMotion features={domAnimation} strict>
        <React.Fragment>
            {isMobile && open && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              />
            )}

          <m.div
            initial={false}
            variants={toggleBtnVariants}
            animate={isMobile ? "mobile" : "desktop"}
            transition={spring}
            className={cn(
              "absolute top-4 flex flex-row gap-2 z-50",
              isMobile && open ? "fixed right-4" : "absolute"
            )}
          >
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (open && view === "NOTIFICATIONS") toggleOpen();
                  else setView("NOTIFICATIONS");
                }
              }}
              onClick={() =>
                open && view === "NOTIFICATIONS"
                  ? toggleOpen()
                  : setView("NOTIFICATIONS")
              }
              className={cn(
                "flex items-center justify-center size-8 rounded-full hover:bg-base-300/75 transition-colors cursor-pointer",
                isMobile && open && view === "NOTIFICATIONS" && "bg-base-200"
              )}
            >
              <HugeiconsIcon
                icon={Notification01Icon}
                fill={view === "NOTIFICATIONS" && open ? "currentColor" : "none"}
                strokeWidth={2}
                className="size-5 text-foreground"
              />
            </div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (open && view === "MEMBERS") toggleOpen();
                  else setView("MEMBERS");
                }
              }}
              onClick={() =>
                open && view === "MEMBERS" ? toggleOpen() : setView("MEMBERS")
              }
              className={cn(
                "flex items-center justify-center size-8 rounded-full hover:bg-base-300/75 transition-colors cursor-pointer",
                isMobile && open && view === "MEMBERS" && "bg-base-200"
              )}
            >
              <HugeiconsIcon
                icon={UserMultiple02Icon}
                fill={view === "MEMBERS" && open ? "currentColor" : "none"}
                strokeWidth={2}
                className="size-5 text-foreground"
              />
            </div>
          </m.div>

          <m.aside
            variants={sidebarVariants}
            animate={isMobile ? "mobile" : "desktop"}
            transition={spring}
            className={cn(
              "flex flex-col gap-4 h-screen bg-base-100 border-l border-base-200 overflow-hidden",
              isMobile ? "fixed right-0 top-0 shadow-2xl border-l" : "border-l"
            )}
          >
            <div className={cn("flex-1 overflow-y-auto", open ? "p-4" : "p-0")}>
              {view === "MEMBERS" ? (
                <SidebarMembers
                  groups={groupedMembers}
                  statuses={statuses}
                  isLoading={isLoading}
                  workspace={workspace}
                  open={openInviteModal}
                  setOpen={setOpenInviteModal}
                />
              ) : (
                <SidebarNotifications />
              )}
            </div>
          </m.aside>
        </React.Fragment>
      </LazyMotion>
    </>
  );
}

export function SidebarNotifications() {
  const { invites, isLoading } = useInvites();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Loading notifications...</span>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <HugeiconsIcon icon={InboxIcon} className="size-12 text-muted-foreground mb-4" />
        <p className="text-foreground font-medium">No Notifications</p>
        <p className="text-muted-foreground text-sm">You are all caught up!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      {invites.map((invite) => (
        <InviteNotification key={invite.id} invite={invite} />
      ))}
    </div>
  );
}

interface SidebarMembersProps {
  groups: {
    role: WorkspaceRoleEnum;
    members: WorkspaceMember[];
  }[];
  statuses: Record<string, UserStatus>;
  isLoading?: boolean;
  workspace: Workspace | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function SidebarMembers({ groups, statuses, isLoading, workspace, open, setOpen }: SidebarMembersProps) {
  return (
    <>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-500">Loading members...</span>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {groups.map((group) => {
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

          <button 
            onClick={() => setOpen(true)}
            className="flex flex-row items-center gap-2 justify-center p-2 mt-auto bg-base-200 rounded-lg hover:bg-base-300/75 transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={AddTeamIcon} className="size-5 text-foreground" />
            <span className="text-base text-foreground font-thin">Invite Members</span>
          </button>
        </div>
      )}

      {open && workspace && (<InviteMemberModal workspace={{ id: workspace.id, name: workspace.name }} isOpen={open} onClose={() => setOpen(false)} />)}
    </>
  );
}

type UserStatus = "ONLINE" | "OFFLINE" | "BUSY" | "AWAY";

interface SidebarProfileProps {
  user: WorkspaceUser | undefined;
  status?: UserStatus;
  className?: string;
}

export function SidebarProfile({ user, status, className }: SidebarProfileProps) {
  const [open, setOpen] = useState(false);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);

  const self = useUser();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    setContextPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  const handleContextClose = () => {
    setOpen(false);
    setContextPos(null);
  };

  return (
    <>
      <div 
        onContextMenu={handleContextMenu}
        onClick={handleContextClose}
        className={cn("relative flex flex-col items-center py-1.5 rounded-lg hover:bg-base-300/75 transition-colors cursor-pointer", className)}
      >
        <div className="px-2 flex-nowrap flex flex-row items-center gap-3 w-full">
          <div className="relative">
            <UserAvatar key={"user-avatar"} user={user} status={status?.toLowerCase()} />
          </div>

          <div className="flex flex-col">
            <p className="text-foreground text-sm leading-tight whitespace-nowrap">{user?.firstname} {user?.lastname}</p>
            <p className="text-muted-foreground text-xs leading-0 whitespace-nowrap h-4 flex items-center truncate">{user?.username}</p>
          </div>
        </div>
      </div>

      {
        open && contextPos && user && self && self.id !== user.id && (
          <ContextMenu
            isOpen={open}
            onClose={handleContextClose}
            position={contextPos}
            user={user}
          />
        )
      }
    </>
  );
}

function ContextMenu({ isOpen, onClose, position, user }: { isOpen: boolean; onClose: () => void; position: { x: number; y: number }; user: WorkspaceUser }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { activeWorkspace: workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const kickMutation = useMutation({
    mutationFn: () => kickWorkspaceMember(workspace!.id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ws-members", workspace?.id] });
      onClose();
    },
    onError: (error) => {
      console.error(error);
      onClose();
    }
  });

  const handleMessageUser = () => {
    onClose();
  };

  const handleKickUser = () => {
    if (workspace && !kickMutation.isPending) {
      const sure = window.confirm(`Are you sure you want to kick ${user.username}?`);
      if (!sure) return;
      
      kickMutation.mutate();
    } else if (!workspace) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed top-0 left-0 z-50 bg-base-100 border border-base-200 rounded-md shadow-xl",
        isOpen ? "block" : "hidden"
      )}
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex flex-col justify-center items-center gap-1 p-1">
        <div 
          className="flex flex-row items-center gap-2 w-full hover:bg-foreground/10 px-2 py-1 rounded-sm transition-colors cursor-pointer"
          onClick={handleMessageUser}
        >
          <HugeiconsIcon icon={Message01Icon} className="size-4 text-foreground" />
          <p className="text-foreground text-xs leading-tight whitespace-nowrap">Message {user.username}</p>
        </div>

        <div 
          className="flex flex-row items-center gap-2 w-full hover:bg-error/10 px-2 py-1 rounded-sm transition-colors cursor-pointer"
          onClick={handleKickUser}
        >
          <HugeiconsIcon icon={Door01Icon} className="size-4 text-error" />
          <p className="text-error text-xs leading-tight whitespace-nowrap">Kick {user.username}</p>
        </div>
      </div>
    </div>
  );
}