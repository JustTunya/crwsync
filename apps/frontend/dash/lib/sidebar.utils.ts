import { HugeiconsIconProps } from "@hugeicons/react";
import { Home03Icon, Task01Icon, Calendar03Icon, DashboardSquare01Icon, Chat01Icon } from "@hugeicons/core-free-icons";
import { WorkspaceModule } from "@crwsync/types";

export type UserStatus = "online" | "offline" | "busy" | "away";

export enum ModuleTypeEnum {
  BOARD = "BOARD",
  CHAT = "CHAT",
}

export const STATUS_META: Record<UserStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "bg-green-500" },
  offline: { label: "Offline", color: "bg-gray-400" },
  busy: { label: "Busy", color: "bg-red-500" },
  away: { label: "Away", color: "bg-yellow-500" },
};

export function getModules(slug: string) {
  return [
    {
      name: "Home",
      icon: Home03Icon,
      href: `/${slug}`,
      shortcut: ["ctrl", "1"],
    },
    {
      name: "Tasks",
      icon: Task01Icon,
      href: `/${slug}/tasks`,
      shortcut: ["ctrl", "2"],
    },
    {
      name: "Schedule",
      icon: Calendar03Icon,
      href: `/${slug}/schedule`,
      shortcut: ["ctrl", "3"],
    },
  ];
}

export function getModuleIcon(type: ModuleTypeEnum | string): HugeiconsIconProps["icon"] {
  switch (type) {
    case ModuleTypeEnum.BOARD:
      return DashboardSquare01Icon;
    case ModuleTypeEnum.CHAT:
      return Chat01Icon;
    default:
      return DashboardSquare01Icon;
  }
}

export function getModuleHref(slug: string, mod: WorkspaceModule): string {
  switch (mod.type) {
    case ModuleTypeEnum.BOARD:
      return `/${slug}/board/${mod.reference_id}`;
    case ModuleTypeEnum.CHAT:
      return `/${slug}/chat/${mod.reference_id}`;
    default:
      return `/${slug}`;
  }
}

export function isModuleActive(
  pathname: string,
  slug: string,
  mod: WorkspaceModule,
): boolean {
  switch (mod.type) {
    case ModuleTypeEnum.BOARD:
      return pathname === `/${slug}/board/${mod.reference_id}`;
    case ModuleTypeEnum.CHAT:
      return pathname === `/${slug}/chat/${mod.reference_id}`;
    default:
      return false;
  }
}
