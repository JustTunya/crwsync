import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatisticsSkeleton } from "../StatisticsSkeleton";

describe("StatisticsSkeleton", () => {
  it("renders the layout container with header and content sections", () => {
    const html = renderToStaticMarkup(<StatisticsSkeleton />);
    expect(html).toContain('data-testid="statistics-skeleton"');
    expect(html).toContain('data-testid="statistics-skeleton-header"');
  });

  it("renders pulsing skeleton placeholders for every dashboard section", () => {
    const html = renderToStaticMarkup(<StatisticsSkeleton />);
    expect(html).toContain("animate-pulse");
    expect(html).toContain('data-testid="statistics-skeleton-kpis"');
    expect(html).toContain('data-testid="statistics-skeleton-throughput"');
    expect(html).toContain('data-testid="statistics-skeleton-workload"');
    expect(html).toContain('data-testid="statistics-skeleton-priority"');
    expect(html).toContain('data-testid="statistics-skeleton-status-flow"');
  });

  it("applies the passed className to the outer container", () => {
    const html = renderToStaticMarkup(<StatisticsSkeleton className="custom-class" />);
    expect(html).toContain("custom-class");
  });
});
