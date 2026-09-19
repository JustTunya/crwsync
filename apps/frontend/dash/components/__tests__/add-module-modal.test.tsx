import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AddModuleModal } from "../add-module-modal";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}));

vi.mock("@/providers/workspace.provider", () => ({
  useWorkspace: () => ({ activeId: "ws-123" }),
}));

vi.mock("@/hooks/use-workspace-projects", () => ({
  useWorkspaceProjects: () => ({
    data: [{ id: "proj-1", name: "Core App", color: "#f97316" }],
  }),
}));

vi.mock("@/hooks/use-boards", () => ({
  useCreateBoard: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/use-chat", () => ({
  useCreateChatRoom: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/use-files", () => ({
  useCreateFileRoom: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("AddModuleModal", () => {
  it("renders nothing when isOpen is false", () => {
    const html = renderToStaticMarkup(<AddModuleModal isOpen={false} onClose={vi.fn()} />);
    expect(html).toBe("");
  });

  it("renders all module options with descriptions and tags when open", () => {
    const html = renderToStaticMarkup(<AddModuleModal isOpen={true} onClose={vi.fn()} />);
    expect(html).toContain("Task Board");
    expect(html).toContain("Kanban &amp; Sprints");
    expect(html).toContain("Chat Room");
    expect(html).toContain("Real-time Channels");
    expect(html).toContain("Team Drive");
    expect(html).toContain("Cloud File Rooms");
    expect(html).toContain("Shared Module");
  });

  it("displays project context when projectId is provided", () => {
    const html = renderToStaticMarkup(
      <AddModuleModal isOpen={true} onClose={vi.fn()} projectId="proj-1" />
    );
    expect(html).toContain("Project: Core App");
  });
});
