import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeVelocityCard } from "../HomeVelocityCard";
import type { WorkspaceHomeSummary } from "@crwsync/types";

function makeSummary(overrides: Partial<WorkspaceHomeSummary> = {}): WorkspaceHomeSummary {
  return {
    greeting: "Good morning",
    todayFormatted: "Monday, September 16",
    urgentCount: 2,
    activeTasksCount: 8,
    completionVelocity: 12,
    workspaceMembersCount: 5,
    ...overrides,
  };
}

describe("HomeVelocityCard", () => {
  it("renders the completion velocity, active tasks count, and urgent count", () => {
    const html = renderToStaticMarkup(<HomeVelocityCard summary={makeSummary()} />);
    expect(html).toContain(">12<");
    expect(html).toContain("8 tasks");
    expect(html).toContain("2 due");
    expect(html).toContain("Personal Momentum");
  });

  it("highlights urgent deadlines when the count is greater than zero", () => {
    const html = renderToStaticMarkup(<HomeVelocityCard summary={makeSummary({ urgentCount: 3 })} />);
    expect(html).toContain("text-alert");
  });

  it("does not highlight urgent deadlines when the count is zero", () => {
    const html = renderToStaticMarkup(<HomeVelocityCard summary={makeSummary({ urgentCount: 0 })} />);
    expect(html).not.toContain("text-alert");
  });

  it("falls back to zeroed metrics when summary is undefined", () => {
    const html = renderToStaticMarkup(<HomeVelocityCard />);
    expect(html).toContain(">0<");
    expect(html).toContain("0 tasks");
    expect(html).toContain("0 due");
  });
});
