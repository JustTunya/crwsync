import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeActiveProjectsSection } from "../HomeActiveProjectsSection";
import type { HomeProjectSummary } from "@crwsync/types";

function findByTestId(node: unknown, testId: string): { props: Record<string, unknown> } | null {
  if (node === null || node === undefined || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByTestId(child, testId);
      if (found) return found;
    }
    return null;
  }
  const element = node as { props?: Record<string, unknown> };
  if (element.props?.["data-testid"] === testId) return element as { props: Record<string, unknown> };
  return findByTestId(element.props?.children, testId);
}

function makeProject(overrides: Partial<HomeProjectSummary> = {}): HomeProjectSummary {
  return {
    id: "proj-1",
    title: "Q3 Launch",
    color: "#3b82f6",
    boardId: "board-1",
    totalTasks: 10,
    completedTasks: 6,
    progressPercentage: 60,
    members: [
      { id: "u1", name: "Ada Lovelace", avatarUrl: null },
      { id: "u2", name: "Grace Hopper", avatarUrl: "https://example.com/avatar.png" },
    ],
    ...overrides,
  };
}

describe("HomeActiveProjectsSection", () => {
  it("renders project titles, task counts, and percentage labels", () => {
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection projects={[makeProject()]} slug="my-workspace" />
    );
    expect(html).toContain("Q3 Launch");
    expect(html).toContain("6 of 10 completed");
    expect(html).toContain("60%");
  });

  it("renders the count badge based on the projects array length", () => {
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection
        projects={[makeProject({ id: "p1" }), makeProject({ id: "p2" })]}
        slug="my-workspace"
      />
    );
    expect(html).toContain(">2<");
  });

  it("applies the progress bar width from progressPercentage", () => {
    const tree = HomeActiveProjectsSection({
      projects: [makeProject({ progressPercentage: 42 })],
      slug: "my-workspace",
    });
    const grid = findByTestId(tree, "home-projects-grid");
    expect(grid).not.toBeNull();
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection projects={[makeProject({ progressPercentage: 42 })]} slug="my-workspace" />
    );
    expect(html).toContain("width:42%");
  });

  it("renders member avatar initials and the overflow badge when there are more than 4 members", () => {
    const members = [
      { id: "u1", name: "Ada Lovelace", avatarUrl: null },
      { id: "u2", name: "Grace Hopper", avatarUrl: null },
      { id: "u3", name: "Alan Turing", avatarUrl: null },
      { id: "u4", name: "Barbara Liskov", avatarUrl: null },
      { id: "u5", name: "Don Knuth", avatarUrl: null },
    ];
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection projects={[makeProject({ members })]} slug="my-workspace" />
    );
    expect(html).toContain("AL");
    expect(html).toContain("GH");
    expect(html).toContain('data-testid="home-project-member-overflow"');
    expect(html).toContain(">+1<");
  });

  it("does not render the overflow badge when there are 4 or fewer members", () => {
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection projects={[makeProject()]} slug="my-workspace" />
    );
    expect(html).not.toContain('data-testid="home-project-member-overflow"');
  });

  it("renders board link hrefs using the workspace slug and board id", () => {
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection projects={[makeProject({ boardId: "board-42" })]} slug="acme" />
    );
    expect(html).toContain('href="/acme/board/board-42"');
  });

  it("falls back to the workspace root when a project has no board", () => {
    const html = renderToStaticMarkup(
      <HomeActiveProjectsSection projects={[makeProject({ boardId: undefined })]} slug="acme" />
    );
    expect(html).toContain('href="/acme"');
  });

  it("renders the empty state when there are no projects", () => {
    const html = renderToStaticMarkup(<HomeActiveProjectsSection projects={[]} slug="my-workspace" />);
    expect(html).toContain("No active projects or boards found in this workspace.");
    expect(html).not.toContain('data-testid="home-project-card"');
    const tree = HomeActiveProjectsSection({ projects: [], slug: "my-workspace" });
    expect(findByTestId(tree, "home-projects-empty-state")).not.toBeNull();
  });

  it("renders the empty state when projects is undefined", () => {
    const tree = HomeActiveProjectsSection({ slug: "my-workspace" });
    expect(findByTestId(tree, "home-projects-empty-state")).not.toBeNull();
  });
});
