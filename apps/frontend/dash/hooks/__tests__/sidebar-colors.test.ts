import { describe, it, expect } from "vitest";
import { COLUMN_COLORS } from "@/lib/kanban.utils";
import { ModuleTypeEnum, type WorkspaceModule, type WorkspaceProject } from "@crwsync/types";

describe("Sidebar Color-Coding Models and Utilities", () => {
  it("defines the standard 7 kanban column colors", () => {
    expect(COLUMN_COLORS).toEqual(["red", "orange", "yellow", "green", "blue", "purple", "pink"]);
  });

  it("applies project color to child modules in memory simulation", () => {
    const project: WorkspaceProject = {
      id: "p-1",
      workspace_id: "ws-1",
      name: "Frontend",
      position: 1000,
      color: "var(--label-purple)",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const modules: WorkspaceModule[] = [
      {
        id: "m-1",
        workspace_id: "ws-1",
        project_id: "p-1",
        type: ModuleTypeEnum.BOARD,
        reference_id: "b-1",
        name: "Sprint 1",
        position: 1000,
        color: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "m-2",
        workspace_id: "ws-1",
        project_id: "p-1",
        type: ModuleTypeEnum.CHAT,
        reference_id: "c-1",
        name: "General",
        position: 2000,
        color: "var(--label-red)",
        created_at: new Date().toISOString(),
      },
    ];

    // Simulating project "Apply to contents"
    const updatedModules = modules.map((m) =>
      m.project_id === project.id ? { ...m, color: project.color } : m
    );

    expect(updatedModules[0].color).toBe("var(--label-purple)");
    expect(updatedModules[1].color).toBe("var(--label-purple)");
  });

  it("handles module-specific color overrides independently", () => {
    const moduleItem: WorkspaceModule = {
      id: "m-1",
      workspace_id: "ws-1",
      project_id: "p-1",
      type: ModuleTypeEnum.BOARD,
      reference_id: "b-1",
      name: "Roadmap",
      position: 1000,
      color: "var(--label-blue)",
      created_at: new Date().toISOString(),
    };

    // Color clear
    const cleared = { ...moduleItem, color: null };
    expect(cleared.color).toBeNull();

    // Color change
    const changed = { ...moduleItem, color: "var(--label-green)" };
    expect(changed.color).toBe("var(--label-green)");
  });

  describe("'Apply to contents' visibility condition", () => {
    function shouldShowApplyToContents(projectColor: string | null | undefined, childModules?: WorkspaceModule[]): boolean {
      const normalizedProjectColor = projectColor || null;
      return Boolean(
        childModules &&
        childModules.length > 0 &&
        childModules.some((m) => (m.color || null) !== normalizedProjectColor)
      );
    }

    it("returns false when project has no child modules", () => {
      expect(shouldShowApplyToContents("var(--label-blue)", [])).toBe(false);
      expect(shouldShowApplyToContents("var(--label-blue)", undefined)).toBe(false);
    });

    it("returns true when project is default/null but at least one child module is colored", () => {
      const children: WorkspaceModule[] = [
        { id: "m-1", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.BOARD, reference_id: "b-1", name: "Board", position: 0, color: "var(--label-red)", created_at: "" },
        { id: "m-2", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.CHAT, reference_id: "c-1", name: "Chat", position: 1, color: null, created_at: "" },
      ];
      expect(shouldShowApplyToContents(null, children)).toBe(true);
      expect(shouldShowApplyToContents(undefined, children)).toBe(true);
    });

    it("returns false when project is default/null and all child modules are default/null", () => {
      const children: WorkspaceModule[] = [
        { id: "m-1", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.BOARD, reference_id: "b-1", name: "Board", position: 0, color: null, created_at: "" },
        { id: "m-2", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.CHAT, reference_id: "c-1", name: "Chat", position: 1, color: null, created_at: "" },
      ];
      expect(shouldShowApplyToContents(null, children)).toBe(false);
    });

    it("returns true when project has a color and at least one child does not match", () => {
      const children: WorkspaceModule[] = [
        { id: "m-1", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.BOARD, reference_id: "b-1", name: "Board", position: 0, color: "var(--label-blue)", created_at: "" },
        { id: "m-2", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.CHAT, reference_id: "c-1", name: "Chat", position: 1, color: "var(--label-yellow)", created_at: "" },
      ];
      expect(shouldShowApplyToContents("var(--label-blue)", children)).toBe(true);
    });

    it("returns false when project has a color and all children match that color", () => {
      const children: WorkspaceModule[] = [
        { id: "m-1", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.BOARD, reference_id: "b-1", name: "Board", position: 0, color: "var(--label-blue)", created_at: "" },
        { id: "m-2", workspace_id: "w-1", project_id: "p-1", type: ModuleTypeEnum.CHAT, reference_id: "c-1", name: "Chat", position: 1, color: "var(--label-blue)", created_at: "" },
      ];
      expect(shouldShowApplyToContents("var(--label-blue)", children)).toBe(false);
    });
  });
});
