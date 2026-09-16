import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeHeader } from "../HomeHeader";
import type { WorkspaceHomeSummary } from "@crwsync/types";

vi.mock("@/components/l-sidebar", () => ({
  LSidebarToggle: () => <button type="button" data-testid="l-sidebar-toggle" />,
}));

vi.mock("@/components/r-sidebar", () => ({
  RSidebarToggle: () => <div data-testid="r-sidebar-toggle" />,
}));

const baseSummary: WorkspaceHomeSummary = {
  greeting: "Good morning, Sam",
  todayFormatted: "Tuesday, Sep 16",
  urgentCount: 3,
  activeTasksCount: 12,
  completionVelocity: 8,
  workspaceMembersCount: 5,
};

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

describe("HomeHeader", () => {
  it("renders greeting and formatted date without the removed header actions", () => {
    const html = renderToStaticMarkup(<HomeHeader summary={baseSummary} />);
    expect(html).toContain("Good morning, Sam");
    expect(html).toContain("Tuesday, Sep 16");
    expect(html).not.toContain("All caught up");
    expect(html).not.toContain("New Task");
    expect(html).not.toContain("Search");
    expect(html).not.toContain('aria-label="Refresh"');
  });

  it("falls back to Home heading when no summary is provided", () => {
    const html = renderToStaticMarkup(<HomeHeader />);
    expect(html).toContain("Home");
  });
});
