import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Menu05Icon } from "@hugeicons/core-free-icons";
import { ProjectAvatar } from "@/components/project-avatar";
import { cn } from "@/lib/utils";

interface SidebarProjectProps {
  icon: HugeiconsIconProps["icon"];
  name?: string;
  extended?: boolean;
}

export function SidebarProject({ icon, name, extended }: SidebarProjectProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors",
        !extended && "justify-center",
      )}
    >
      <ProjectAvatar icon={icon} />
      {extended && (
        <p className="text-foreground text-xs font-medium whitespace-nowrap">
          {name}
        </p>
      )}
    </div>
  );
}

export function SidebarToggle({
  toggleOpen,
  className,
}: {
  toggleOpen: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-1 rounded-full hover:bg-base-200 transition-colors cursor-pointer",
        className,
      )}
      onClick={toggleOpen}
    >
      <HugeiconsIcon icon={Menu05Icon} className="size-5 text-foreground" />
    </div>
  );
}
