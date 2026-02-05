import { Sidebar } from "@/components/sidebar";
import { MlSidebar } from "@/components/ml-sidebar";
import { WorkspaceProvider } from "@/providers/workspace.provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
        <MlSidebar />
      </div>
    </WorkspaceProvider>
  );
}
