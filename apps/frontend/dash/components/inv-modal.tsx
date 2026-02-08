"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { InviteMemberPayload, UserType } from "@crwsync/types";
import { Input } from "@/components/ui/input";
import { SidebarProfile } from "@/components/r-sidebar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchUsers } from "@/hooks/use-search-user";
import { inviteMember } from "@/services/workspace.service";

interface InviteMemberModalProps {
  workspace: {
    id: string | undefined;
    name: string | undefined;
  }
  isOpen: boolean;
  onClose: () => void;
}

//! TODO: Use enum from packages/types
export enum WorkspaceRoleEnum {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  GUEST = "GUEST",
}

export default function InviteMemberModal({ workspace, isOpen, onClose }: InviteMemberModalProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<WorkspaceRoleEnum>(WorkspaceRoleEnum.MEMBER);

  const { users } = useSearchUsers(identifier);

  const handleClose = () => {
    setIdentifier("");
    setUser(null);
    onClose();
  };


  const handleInvite = () => {
    if (!user || !workspace.id) return;
    
    const payload: InviteMemberPayload = {
      invitee_id: user.id,
      role: role as WorkspaceRoleEnum,
    };

    inviteMember(workspace.id, payload).then(() => {
      handleClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50" onClick={handleClose}>
      <div className="flex flex-col gap-4 bg-base-100 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-lg text-center font-semibold leading-tight mb-4">Invite people to {workspace.name}</h2>
          <p className="text-sm text-muted-foreground text-center leading-0 mb-6">Search by username or email</p>
        </div>

        {user ? (
          <>
            <div className="flex flex-row items-center justify-between gap-2">
              <SidebarProfile user={user} className="hover:bg-transparent cursor-default" />
              <div className="flex items-center gap-2">
                <SelectMemberRole role={role as WorkspaceRoleEnum} setRole={setRole} />
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-6 p-1 rounded-full text-muted-foreground hover:bg-base-200 hover:text-foreground transition-colors cursor-pointer" onClick={() => setUser(null)} />
              </div>
            </div>
          </>
        ) : (
          <>
            <Input 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter username or email"
              className="bg-base-200"
            />

            {users.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <div key={u.id} onClick={() => setUser(u)}>
                    <SidebarProfile user={u} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={handleClose}
            className="w-full py-1 border border-base-foreground text-foreground rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button 
            disabled={!user}
            onClick={handleInvite}
            className="w-full py-1 bg-primary text-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

interface SelectMemberRoleProps {
  role: WorkspaceRoleEnum;
  setRole: (role: WorkspaceRoleEnum) => void;
}

export function SelectMemberRole({ role, setRole }: SelectMemberRoleProps) {
  return (
    <Select defaultValue={role} value={role} onValueChange={(value) => setRole(value as WorkspaceRoleEnum)}>
      <SelectTrigger className="border-none bg-transparent dark:bg-transparent hover:bg-base-200 dark:hover:bg-base-200">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={WorkspaceRoleEnum.ADMIN}>Admin</SelectItem>
          <SelectItem value={WorkspaceRoleEnum.MEMBER}>Member</SelectItem>
          <SelectItem value={WorkspaceRoleEnum.GUEST}>Guest</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}