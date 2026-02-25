"use client";

import { useParams } from "next/navigation";
import { useWorkspace } from "@/providers/workspace.provider";
import { useUser } from "@/providers/user.provider";
import { ChatRoom } from "@/components/chat/ChatRoom";

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { activeWorkspace } = useWorkspace();
  const user = useUser();

  const workspaceId = activeWorkspace?.id || "";
  const currentUserId = user?.id || "";

  if (!workspaceId || !currentUserId || !roomId) {
    return (
      <div className="size-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ChatRoom
        workspaceId={workspaceId}
        roomId={roomId}
        currentUserId={currentUserId}
      />
    </div>
  );
}
