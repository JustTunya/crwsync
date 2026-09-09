import { LSidebar } from "@/components/l-sidebar";
import { RSidebar } from "@/components/r-sidebar";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full">
      <LSidebar />
      <main className="flex-1 min-w-0">{children}</main>
      <RSidebar />
    </div>
  );
}
