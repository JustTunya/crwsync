import { describe, it, expect } from "vitest";
import { Home03Icon, Activity01Icon, Calendar03Icon, KanbanIcon, Chat01Icon, Database01Icon } from "@hugeicons/core-free-icons";
import {
  getModules,
  getModuleIcon,
  getModuleHref,
  isModuleActive,
  ModuleTypeEnum,
} from "@/lib/sidebar.utils";
import { WorkspaceModule } from "@crwsync/types";

describe("sidebar.utils", () => {
  describe("getModules", () => {
    it("returns Home, Statistics, and Schedules modules with correct routes and shortcuts", () => {
      const slug = "test-workspace";
      const modules = getModules(slug);

      expect(modules).toHaveLength(3);
      expect(modules).toEqual([
        {
          name: "Home",
          icon: Home03Icon,
          href: "/test-workspace",
          shortcut: ["ctrl", "1"],
        },
        {
          name: "Statistics",
          icon: Activity01Icon,
          href: "/test-workspace/statistics",
          shortcut: ["ctrl", "2"],
        },
        {
          name: "Schedules",
          icon: Calendar03Icon,
          href: "/test-workspace/schedules",
          shortcut: ["ctrl", "3"],
        },
      ]);
    });
  });

  describe("getModuleIcon", () => {
    it("returns correct icon for each module type", () => {
      expect(getModuleIcon(ModuleTypeEnum.BOARD)).toBe(KanbanIcon);
      expect(getModuleIcon(ModuleTypeEnum.CHAT)).toBe(Chat01Icon);
      expect(getModuleIcon(ModuleTypeEnum.FILES)).toBe(Database01Icon);
      expect(getModuleIcon("UNKNOWN")).toBe(KanbanIcon);
    });
  });

  describe("getModuleHref", () => {
    const mockModule: WorkspaceModule = {
      id: "mod-1",
      name: "Test Module",
      type: "BOARD",
      reference_id: "ref-123",
      workspace_id: "ws-1",
      project_id: null,
      order: 0,
      color: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("generates correct href for board module", () => {
      expect(getModuleHref("test-slug", mockModule)).toBe("/test-slug/board/ref-123");
    });

    it("generates correct href for chat module", () => {
      expect(getModuleHref("test-slug", { ...mockModule, type: "CHAT" })).toBe("/test-slug/chat/ref-123");
    });

    it("generates correct href for files module", () => {
      expect(getModuleHref("test-slug", { ...mockModule, type: "FILES" })).toBe("/test-slug/files/ref-123");
    });

    it("returns fallback href for unknown type", () => {
      expect(getModuleHref("test-slug", { ...mockModule, type: "UNKNOWN" as unknown as WorkspaceModule["type"] })).toBe("/test-slug");
    });
  });

  describe("isModuleActive", () => {
    const mockModule: WorkspaceModule = {
      id: "mod-1",
      name: "Test Module",
      type: "BOARD",
      reference_id: "ref-123",
      workspace_id: "ws-1",
      project_id: null,
      order: 0,
      color: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("returns true when pathname matches module href", () => {
      expect(isModuleActive("/test-slug/board/ref-123", "test-slug", mockModule)).toBe(true);
    });

    it("returns false when pathname does not match module href", () => {
      expect(isModuleActive("/test-slug/board/other", "test-slug", mockModule)).toBe(false);
    });
  });
});
