import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";

export default function ProjectAvatar({ icon }: { icon: HugeiconsIconProps["icon"] }) {
  return (
    <div className="flex items-center justify-center size-6 rounded-sm bg-primary inset-shadow-xs inset-shadow-white/30 shadow-sm">
      <div className="flex items-center justify-center size-full rounded-sm bg-linear-to-b from-white/15 to-transparent">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 text-primary-foreground" />
      </div>
    </div>
  );
}