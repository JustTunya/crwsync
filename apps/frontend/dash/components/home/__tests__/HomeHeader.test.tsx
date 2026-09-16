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
  it("renders greeting, formatted date, and urgent pulse badge with summary counts", () => {
    const html = renderToStaticMarkup(<HomeHeader summary={baseSummary} />);
    expect(html).toContain("Good morning, Sam");
    expect(html).toContain("Tuesday, Sep 16");
    expect(html).toContain("3 due today");
    expect(html).toContain("8 velocity");
    expect(html).toContain("bg-alert/15");
    expect(html).toContain("text-alert");
  });

  it("renders calm pulse badge when urgentCount is 0", () => {
    const html = renderToStaticMarkup(
      <HomeHeader summary={{ ...baseSummary, urgentCount: 0 }} />
    );
    expect(html).toContain("All caught up");
    expect(html).toContain("8 completed");
    expect(html).toContain("bg-success/15");
    expect(html).toContain("text-success");
    expect(html).not.toContain("due today");
  });

  it("falls back to Home heading when no summary is provided", () => {
    const html = renderToStaticMarkup(<HomeHeader />);
    expect(html).toContain("Home");
  });

  it("calls onNewTask when the New Task button is clicked", () => {
    const onNewTask = vi.fn();
    const tree = HomeHeader({ summary: baseSummary, onNewTask });
    const button = findByTestId(tree, "home-new-task-button");
    (button?.props.onClick as () => void)();
    expect(onNewTask).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenSearch when the Search button is clicked", () => {
    const onOpenSearch = vi.fn();
    const tree = HomeHeader({ summary: baseSummary, onOpenSearch });
    const button = findByTestId(tree, "home-search-button");
    (button?.props.onClick as () => void)();
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it("calls onRefresh when the Refresh button is clicked", () => {
    const onRefresh = vi.fn();
    const tree = HomeHeader({ summary: baseSummary, onRefresh });
    const button = findByTestId(tree, "home-refresh-button");
    (button?.props.onClick as () => void)();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
