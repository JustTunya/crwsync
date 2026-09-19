"use client";

import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Separator } from "@/components/ui/separator";

interface SectionHeaderProps {
  id?: string;
  icon: HugeiconsIconProps["icon"];
  title: string;
  description: string;
  className?: string;
  showDivider?: boolean;
}

export function SectionHeader({ id, icon, title, description, className, showDivider = true }: SectionHeaderProps) {
  return (
    <div id={id} className={className}>
      {showDivider && <Separator className="mb-8 bg-border/80" />}
      <div className="flex items-start gap-3.5 mb-5 scroll-mt-28">
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-black/5">
          <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
