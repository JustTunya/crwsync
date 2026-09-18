import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SchedulesSkeleton } from "../SchedulesSkeleton";

describe("SchedulesSkeleton", () => {
  it("renders the layout container with header, agenda, and sidebar sections", () => {
    const html = renderToStaticMarkup(<SchedulesSkeleton />);
    expect(html).toContain('data-testid="schedules-skeleton"');
    expect(html).toContain('data-testid="schedules-skeleton-header"');
    expect(html).toContain('data-testid="schedules-skeleton-agenda"');
    expect(html).toContain('data-testid="schedules-skeleton-sidebar"');
  });

  it("renders pulsing skeleton placeholders", () => {
    const html = renderToStaticMarkup(<SchedulesSkeleton />);
    expect(html).toContain("animate-pulse");
  });

  it("applies the passed className to the outer container", () => {
    const html = renderToStaticMarkup(<SchedulesSkeleton className="custom-class" />);
    expect(html).toContain("custom-class");
  });
});
