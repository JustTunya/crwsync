import { LSidebar } from "@/components/l-sidebar";
import { RSidebar } from "@/components/r-sidebar";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <LSidebar />
      <main className="flex-1 min-w-0 h-full overflow-hidden">{children}</main>
      <RSidebar />
    </div>
  );
}
