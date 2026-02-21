"use client";

import { redirect } from "next/navigation";
import { useWorkspaces } from "@/hooks/use-workspaces";

export default function RootPage() {
  const { data: workspaces, isLoading } = useWorkspaces();

  if (!isLoading) {
    if (workspaces && workspaces.length > 0) {
      const lastWsId = typeof window !== "undefined" ? localStorage.getItem("crw-ws") : null;
      const lastWs = workspaces.find(w => w.workspace_id === lastWsId);
      
      if (lastWs?.workspace) {
        redirect(`/${lastWs.workspace.slug}`);
      } else if (workspaces[0]?.workspace) {
        redirect(`/${workspaces[0].workspace.slug}`);
      }
    } else {
      redirect("/create-workspace");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
