"use client";

import { useParams } from "next/navigation";
import { useWorkspace } from "@/providers/workspace.provider";
import { FilesRoom } from "@/components/files/FilesRoom";

export default function FilesPage() {
  const { fileRoomId } = useParams<{ fileRoomId: string }>();
  const { activeId } = useWorkspace();

  const workspaceId = activeId || "";

  if (!workspaceId || !fileRoomId) {
    return (
      <div className="size-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <FilesRoom workspaceId={workspaceId} roomId={fileRoomId} />
    </div>
  );
}
