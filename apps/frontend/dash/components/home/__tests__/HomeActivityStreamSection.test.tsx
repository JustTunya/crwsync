import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeActivityStreamSection } from "../HomeActivityStreamSection";
import type { HomeActivityItem } from "@crwsync/types";

function makeActivityItem(overrides: Partial<HomeActivityItem> = {}): HomeActivityItem {
  return {
    id: "activity-1",
    type: "task_completed",
    message: "completed",
    actor: { id: "user-1", name: "Riley Ocean" },
    target: { id: "task-1", title: "Ship the release notes", href: "/board/board-1" },
    createdAt: "2026-09-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("HomeActivityStreamSection", () => {
  it("renders activity items with actor names, messages, and target links", () => {
    const html = renderToStaticMarkup(
      <HomeActivityStreamSection activity={[makeActivityItem()]} slug="acme" />
    );
    expect(html).toContain("Riley Ocean");
    expect(html).toContain("completed");
    expect(html).toContain("Ship the release notes");
    expect(html).toContain('href="/board/board-1"');
  });

  it("handles raw avatar key in actor without crashing next/image", () => {
    const html = renderToStaticMarkup(
      <HomeActivityStreamSection
        activity={[
          makeActivityItem({
            actor: {
              id: "user-2",
              name: "Mara Ellis",
              avatarUrl: "a3c4c5de-e31d-4e80-bbca-9e6cba8aea22_avatar.jpg",
            },
          }),
        ]}
        slug="northstar"
      />
    );
    expect(html).toContain("Mara Ellis");
  });

  it("renders empty state when activity is empty or undefined", () => {
    const html = renderToStaticMarkup(<HomeActivityStreamSection activity={[]} slug="acme" />);
    expect(html).toContain("No recent workspace activity.");

    const html2 = renderToStaticMarkup(<HomeActivityStreamSection slug="acme" />);
    expect(html2).toContain("No recent workspace activity.");
  });
});
