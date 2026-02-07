import { Invite } from "@/hooks/use-invites";
import { acceptInvite, declineInvite } from "@/services/workspace.service";

interface WorkspaceInviteProps {
  invite: Invite;
}

export function WorkspaceInvite({ invite }: WorkspaceInviteProps) {
  const handleAccept = async () => {
    const { success, message } = await acceptInvite(invite.workspace.id);
    console.log(success, message);
  };

  const handleDecline = async () => {
    const { success, message } = await declineInvite(invite.workspace.id);
    console.log(success, message);
  };

  return (
    <div>
      <p>{invite.creator.firstname} {invite.creator.lastname} invited you to be a(n) {invite.role} in {invite.workspace.name}</p>
      <div className="flex items-center gap-4">
        <button onClick={handleDecline} className="w-full py-1 border border-base-foreground text-foreground rounded-lg hover:bg-base-200 transition-colors cursor-pointer">Decline</button>
        <button onClick={handleAccept} className="w-full py-1 bg-primary text-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer">Accept</button>
      </div>
    </div>
  );
}
