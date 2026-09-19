"use client";

import Link from "next/link";
import { useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Logout02Icon } from "@hugeicons/core-free-icons";

import { useWorkspaces } from "@/hooks/use-workspaces";
import { useUser } from "@/providers/user.provider";
import { signout } from "@/services/auth.service";
import { GlassBox } from "@/components/ui/glassbox";
import { UserAvatar } from "@/components/user-avatar";
import { CreateWorkspaceForm } from "@/components/create-ws-form";

export default function CreateWorkspacePage() {
  const user = useUser();
  const { data: workspaces = [] } = useWorkspaces();
  const [signingOut, startSignout] = useTransition();

  const hasWorkspaces = workspaces.length > 0;
  const lastWsId = typeof window !== "undefined" ? localStorage.getItem("crw-ws") : null;
  const activeWs = workspaces.find((w) => w.workspace_id === lastWsId) || workspaces[0];
  const targetSlug = activeWs?.workspace?.slug;

  const handleSignout = () => {
    if (signingOut) return;
    startSignout(async () => {
      await signout();
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "/";
      window.location.assign(webUrl);
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Floating Top Navigation */}
      <header className="relative z-50 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-between gap-3">
        {/* Left: Escape Navigation */}
        <div>
          {hasWorkspaces && targetSlug ? (
            <Link
              href={`/${targetSlug}`}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground bg-background/40 dark:bg-foreground/5 hover:bg-background/80 dark:hover:bg-foreground/10 border border-foreground/10 hover:border-foreground/20 backdrop-blur-md shadow-xs rounded-full transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              aria-label="Back to dashboard"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                strokeWidth={2}
                className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              <span className="hidden xs:inline">Back to</span>
              <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                {activeWs?.workspace?.name || "Dashboard"}
              </span>
            </Link>
          ) : (
            <a
              href={process.env.NEXT_PUBLIC_WEB_URL || "/"}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground bg-background/40 dark:bg-foreground/5 hover:bg-background/80 dark:hover:bg-foreground/10 border border-foreground/10 hover:border-foreground/20 backdrop-blur-md shadow-xs rounded-full transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              aria-label="Back to home"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                strokeWidth={2}
                className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              <span>Back to home</span>
            </a>
          )}
        </div>

        {/* Right: User Session */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {user && (
            <div className="flex items-center gap-2 pl-2 sm:pl-2.5 pr-1.5 sm:pr-2 py-1 bg-background/40 dark:bg-foreground/5 border border-foreground/10 backdrop-blur-md rounded-full shadow-xs">
              <UserAvatar user={user} size={6} />
              <span className="hidden sm:inline text-xs font-medium text-foreground max-w-[120px] truncate">
                {user.firstname} {user.lastname}
              </span>
              <button
                type="button"
                onClick={handleSignout}
                disabled={signingOut}
                className="p-1 text-muted-foreground hover:text-error hover:bg-error/10 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-error/50 focus-visible:outline-none"
                title="Sign out"
                aria-label="Sign out"
              >
                <HugeiconsIcon icon={Logout02Icon} size={14} strokeWidth={2} className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Creation Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 lg:border-x lg:border-border">
        <GlassBox className="w-full max-w-lg p-6 sm:p-8">
          <div className="text-center space-y-1.5 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Create a new workspace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto font-normal leading-relaxed">
              Set up a shared space for your crew to collaborate on projects, boards, files, and chats.
            </p>
          </div>

          <CreateWorkspaceForm />

          <p className="text-[11px] text-muted-foreground text-center mt-6 select-none">
            You can invite teammates and customize modules anytime in settings.
          </p>
        </GlassBox>
      </main>

      {/* Subtle Footer */}
      <footer role="contentinfo" className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground/60 select-none lg:border-x lg:border-border">
          crwsync &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
