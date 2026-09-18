import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeSkeleton } from "../HomeSkeleton";

describe("HomeSkeleton", () => {
  it("renders the layout container with header and bento columns", () => {
    const html = renderToStaticMarkup(<HomeSkeleton />);
    expect(html).toContain('data-testid="home-skeleton"');
    expect(html).toContain("@5xl:col-span-8");
    expect(html).toContain("@5xl:col-span-4");
  });

  it("renders pulsing skeleton placeholders for every bento section", () => {
    const html = renderToStaticMarkup(<HomeSkeleton />);
    expect(html).toContain("animate-pulse");
    expect(html).toContain('data-testid="home-skeleton-header"');
    expect(html).toContain('data-testid="home-skeleton-focus"');
    expect(html).toContain('data-testid="home-skeleton-projects"');
    expect(html).toContain('data-testid="home-skeleton-pinned"');
    expect(html).toContain('data-testid="home-skeleton-activity"');
    expect(html).toContain('data-testid="home-skeleton-velocity"');
  });

  it("applies the passed className to the outer container", () => {
    const html = renderToStaticMarkup(<HomeSkeleton className="custom-class" />);
    expect(html).toContain("custom-class");
  });
});
