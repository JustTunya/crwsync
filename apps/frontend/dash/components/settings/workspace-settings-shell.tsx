"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { ArrowLeft01Icon, Settings02Icon, UserMultiple02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/providers/user.provider";
import { useWorkspace } from "@/providers/workspace.provider";
import { useWorkspaceRole } from "@/hooks/use-workspaces";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { LSidebarToggle } from "@/components/l-sidebar";
import { RSidebarToggle } from "@/components/r-sidebar";
import { cn } from "@/lib/utils";

interface SectionNav {
  id: string;
  label: string;
  icon: HugeiconsIconProps["icon"];
  isDanger?: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export function WorkspaceSettingsShell({ children }: { children: React.ReactNode }) {
  const { activeWorkspace: workspace, loading } = useWorkspace();
  const user = useUser();
  const router = useRouter();

  const { isOwner, isAdmin, isLoading: roleLoading } = useWorkspaceRole(workspace?.id, user?.id);
  const resolving = loading.active || roleLoading || !workspace;

  const [activeSection, setActiveSection] = useState<string>("general");
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (!resolving && workspace && !isAdmin) {
      router.replace(`/${workspace.slug}`);
    }
  }, [resolving, workspace, isAdmin, router]);

  const sections: SectionNav[] = [
    { id: "general", label: "General", icon: Settings02Icon },
    { id: "members", label: "Members & Roles", icon: UserMultiple02Icon },
    ...(isOwner ? [{ id: "danger-zone", label: "Danger Zone", icon: Alert02Icon, isDanger: true }] : []),
  ];

  useEffect(() => {
    if (resolving || !workspace) return;

    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
          setActiveSection(targetId);
        }, 100);
      }
    }

    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (isScrollingRef.current) return;
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) {
        setActiveSection(visible.target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    });

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolving, workspace?.id]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    isScrollingRef.current = true;
    setActiveSection(id);
    el.scrollIntoView({ behavior: "smooth" });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  };

  if (resolving) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <span className="text-sm text-muted-foreground">Loading workspace settings...</span>
      </div>
    );
  }

  if (!isAdmin || !workspace) return null;

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 px-4 sm:px-8 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <LSidebarToggle />
          <Link
            href={`/${workspace.slug}`}
            className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" strokeWidth={2} />
            <span className="sr-only">Back to workspace</span>
          </Link>

          <WorkspaceAvatar
            avatar_key={workspace.logo_key || ""}
            name={workspace.name}
            className="size-7 sm:size-8 rounded-lg text-xs shrink-0"
          />

          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground leading-4 hidden sm:block truncate">Workspace Settings</p>
          </div>
        </div>

        <RSidebarToggle />
      </header>

      <nav
        aria-label="Workspace settings navigation"
        className="sticky top-16 z-20 flex items-center gap-1.5 px-4 sm:px-8 h-12 border-b border-border bg-background/90 backdrop-blur-md overflow-x-auto no-scrollbar"
      >
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 border",
                isActive
                  ? section.isDanger
                    ? "bg-destructive/10 text-destructive border-destructive/30 shadow-xs"
                    : "bg-primary/10 text-primary border-primary/25 shadow-xs font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              <HugeiconsIcon icon={section.icon} className="size-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
              {section.label}
            </button>
          );
        })}
      </nav>

      <motion.main
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl mx-auto space-y-12 pb-24">{children}</div>
      </motion.main>
    </div>
  );
}
