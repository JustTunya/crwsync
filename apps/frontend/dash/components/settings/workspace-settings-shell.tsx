"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Settings02Icon, UserMultiple02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { useWorkspaceRole } from "@/hooks/use-workspaces";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export function WorkspaceSettingsShell({ children }: { children: React.ReactNode }) {
  const { activeWorkspace: workspace, loading } = useWorkspace();
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const { isOwner, isAdmin, isLoading: roleLoading } = useWorkspaceRole(workspace?.id, user?.id);
  const resolving = loading.active || roleLoading || !workspace;

  useEffect(() => {
    if (!resolving && workspace && !isAdmin) {
      router.replace(`/${workspace.slug}`);
    }
  }, [resolving, workspace, isAdmin, router]);

  if (resolving) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  if (!isAdmin) return null;

  const TABS = [
    { href: `/${workspace.slug}/settings`, label: "General", icon: Settings02Icon },
    { href: `/${workspace.slug}/settings/members`, label: "Members", icon: UserMultiple02Icon },
    ...(isOwner ? [{ href: `/${workspace.slug}/settings/danger`, label: "Danger Zone", icon: Alert02Icon }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 h-16 pl-16 pr-24 border-b border-base-200">
        <Link
          href={`/${workspace.slug}`}
          className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" strokeWidth={2} />
          <span className="sr-only">Back to workspace</span>
        </Link>

        <WorkspaceAvatar avatar_key={workspace.logo_key || ""} name={workspace.name} className="size-8 text-xs" />

        <div>
          <h1 className="text-lg font-semibold text-foreground">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground leading-4">Workspace settings</p>
        </div>
      </header>

      <nav className="flex items-center gap-1 px-4 sm:px-8 h-12 border-b border-base-200">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <HugeiconsIcon icon={tab.icon} className="size-4" strokeWidth={2} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <motion.div
        className="flex-1 overflow-y-auto p-4 sm:p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-2xl mx-auto space-y-6">{children}</div>
      </motion.div>
    </div>
  );
}
