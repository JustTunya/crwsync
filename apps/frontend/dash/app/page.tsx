"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaces } from "@/hooks/use-workspaces";

export default function RootPage() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();

  useEffect(() => {
    if (isLoading) return;

    if (workspaces && workspaces.length > 0) {
      const lastWsId = localStorage.getItem("crw-ws");
      const lastWs = workspaces.find(w => w.workspace_id === lastWsId);
      
      if (lastWs?.workspace) {
        router.replace(`/${lastWs.workspace.slug}`);
      } else if (workspaces[0]?.workspace) {
        router.replace(`/${workspaces[0].workspace.slug}`);
      }
    } else {
      router.replace("/create-workspace");
    }
  }, [workspaces, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
