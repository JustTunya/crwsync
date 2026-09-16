"use client";

import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HomeProjectSummary } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { cn } from "@/lib/utils";

export interface HomeActiveProjectsSectionProps {
  projects?: HomeProjectSummary[];
  slug: string;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function HomeProjectMemberStack({ members }: { members: HomeProjectSummary["members"] }) {
  const visible = members.slice(0, 4);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((member) => (
        <div
          key={member.id}
          className="size-6 rounded-full border-2 border-card bg-base-300 text-[10px] font-semibold flex items-center justify-center text-foreground overflow-hidden"
        >
          {member.avatarUrl ? (
            <Image
              src={member.avatarUrl}
              alt={member.name}
              title={member.name}
              width={24}
              height={24}
              className="size-full object-cover"
            />
          ) : (
            <span title={member.name}>{getInitials(member.name)}</span>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          data-testid="home-project-member-overflow"
          className="size-6 rounded-full border-2 border-card bg-base-300 text-[10px] font-semibold flex items-center justify-center text-foreground"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

function HomeProjectCard({ project, slug }: { project: HomeProjectSummary; slug: string }) {
  return (
    <Link
      href={project.boardId ? `/${slug}/board/${project.boardId}` : `/${slug}`}
      className="block outline-none h-full"
      data-testid="home-project-card"
    >
      <GlassBox className="w-full! h-full mx-0! p-4 flex flex-col justify-start gap-3.5 hover:bg-base-200/40 hover:border-base-300 transition-all cursor-pointer group">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: project.color || "#f97316" }} />
            {project.title}
          </h3>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-base-200 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${project.progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center gap-2 text-xs text-muted-foreground font-medium">
            <span>
              {project.completedTasks} of {project.totalTasks} completed
            </span>
            <span>{project.progressPercentage}%</span>
          </div>
        </div>

        <HomeProjectMemberStack members={project.members} />
      </GlassBox>
    </Link>
  );
}

export function HomeActiveProjectsSection({ projects, slug, className }: HomeActiveProjectsSectionProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Folder01Icon} className="size-4 text-primary" />
          Active Projects
        </h2>
        <span className="text-xs text-muted-foreground font-medium bg-base-200 px-2 py-0.5 rounded-full">
          {projects?.length ?? 0}
        </span>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch" data-testid="home-projects-grid">
          {projects.map((project) => (
            <HomeProjectCard key={project.id} project={project} slug={slug} />
          ))}
        </div>
      ) : (
        <div
          data-testid="home-projects-empty-state"
          className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-base-200/80 bg-base-100/40"
        >
          <p className="text-sm text-muted-foreground">
            No active projects or boards found in this workspace.
          </p>
        </div>
      )}
    </div>
  );
}
