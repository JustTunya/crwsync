"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/workspace.provider";
import { getWorkspaceMembers } from "@/services/workspace.service";

//! TODO: Use enum from packages/types
export enum WorkspaceRoleEnum {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  GUEST = "guest",
}

export function MlSidebar() {
  const { activeWorkspace: workspace } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["ws-members", workspace?.id],
    queryFn: () => getWorkspaceMembers(workspace!.id),
    enabled: !!workspace?.id,
  });

  const sortedMembers = useMemo(() => {
    if (!data) return [];

    const ROLE_ORDER: Record<WorkspaceRoleEnum, number> = {
      [WorkspaceRoleEnum.OWNER]: 1,
      [WorkspaceRoleEnum.ADMIN]: 2,
      [WorkspaceRoleEnum.MEMBER]: 3,
      [WorkspaceRoleEnum.GUEST]: 4,
    };

    const members = data?.data || [];

    return members.sort((a, b) => {
      const rankA = ROLE_ORDER[a.role] ?? 99;
      const rankB = ROLE_ORDER[b.role] ?? 99;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const fnameA = a.user?.firstname ?? "";
      const fnameB = b.user?.firstname ?? "";

      return fnameA.localeCompare(fnameB);
    });
  }, [data]);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-base-100 border-l border-base-200 overflow-hidden">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-500">Loading members...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {sortedMembers.map((member) => (
            <p key={member.id} className="px-4 py-2 hover:bg-base-200 cursor-pointer">
              {member.user?.firstname} {member.user?.lastname}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}