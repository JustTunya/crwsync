"use client";

import { useInvites } from "@/hooks/use-invites";
import { WorkspaceInvite } from "@/components/ws-invite";

export default function InboxPage() {
  const { invites, isLoading } = useInvites();

  return (
    <div className="size-full flex flex-col p-6">
      <h1 className="text-2xl font-semibold mb-6">Inbox</h1>
      
      {isLoading ? (
        <p>Loading invites...</p>
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <p>No pending invites</p>
        </div>
      ) : (
        <div className="max-w-2xl w-full mx-auto">
          {invites.map((invite) => (
            <WorkspaceInvite key={invite.id} invite={invite} />
          ))}
        </div>
      )}
    </div>
  );
}