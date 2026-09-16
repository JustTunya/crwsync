import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricDeltaBadge } from "../MetricDeltaBadge";
import type { MetricDelta } from "@crwsync/types";

describe("MetricDeltaBadge", () => {
  it("renders placeholder with neutral styling when delta is undefined or null", () => {
    const htmlNull = renderToStaticMarkup(<MetricDeltaBadge delta={null} />);
    expect(htmlNull).toContain("bg-muted");
    expect(htmlNull).toContain("text-muted-foreground");
    expect(htmlNull).toContain("border-border");
    expect(htmlNull).toContain("—");

    const htmlUndefined = renderToStaticMarkup(<MetricDeltaBadge />);
    expect(htmlUndefined).toContain("bg-muted");
    expect(htmlUndefined).toContain("text-muted-foreground");
    expect(htmlUndefined).toContain("border-border");
    expect(htmlUndefined).toContain("—");
  });

  it("renders red styling (bg-error, text-error, border-error) when delta is negative", () => {
    const negativeDelta: MetricDelta = {
      current: 5,
      previous: 10,
      deltaPercent: -50,
      trend: "down",
      sentiment: "positive",
    };

    const html = renderToStaticMarkup(<MetricDeltaBadge delta={negativeDelta} />);
    expect(html).toContain("bg-error/15");
    expect(html).toContain("text-error");
    expect(html).toContain("border-error/30");
    expect(html).not.toContain("text-success");
    expect(html).not.toContain("bg-success/15");
    expect(html).toContain("-50%");
  });

  it("renders red styling for fractional negative values", () => {
    const negativeDelta: MetricDelta = {
      current: 1,
      previous: 3,
      deltaPercent: -66.7,
      trend: "down",
      sentiment: "positive",
    };

    const html = renderToStaticMarkup(<MetricDeltaBadge delta={negativeDelta} />);
    expect(html).toContain("bg-error/15");
    expect(html).toContain("text-error");
    expect(html).toContain("border-error/30");
    expect(html).toContain("-66.7%");
  });

  it("renders green styling (bg-success, text-success, border-success) when delta is positive", () => {
    const positiveDelta: MetricDelta = {
      current: 10,
      previous: 5,
      deltaPercent: 100,
      trend: "up",
      sentiment: "positive",
    };

    const html = renderToStaticMarkup(<MetricDeltaBadge delta={positiveDelta} />);
    expect(html).toContain("bg-success/15");
    expect(html).toContain("text-success");
    expect(html).toContain("border-success/30");
    expect(html).not.toContain("text-error");
    expect(html).not.toContain("bg-error/15");
    expect(html).toContain("+100%");
  });

  it("renders neutral styling when deltaPercent is 0", () => {
    const zeroDelta: MetricDelta = {
      current: 5,
      previous: 5,
      deltaPercent: 0,
      trend: "neutral",
      sentiment: "neutral",
    };

    const html = renderToStaticMarkup(<MetricDeltaBadge delta={zeroDelta} />);
    expect(html).toContain("bg-muted");
    expect(html).toContain("text-muted-foreground");
    expect(html).toContain("border-border");
    expect(html).toContain("0%");
  });

  it("handles null deltaPercent with up trend as positive and down trend as negative", () => {
    const upNullDelta: MetricDelta = {
      current: 5,
      previous: 0,
      deltaPercent: null,
      trend: "up",
      sentiment: "positive",
    };
    const htmlUp = renderToStaticMarkup(<MetricDeltaBadge delta={upNullDelta} />);
    expect(htmlUp).toContain("bg-success/15");
    expect(htmlUp).toContain("text-success");
    expect(htmlUp).toContain("border-success/30");

    const downNullDelta: MetricDelta = {
      current: 0,
      previous: 5,
      deltaPercent: null,
      trend: "down",
      sentiment: "negative",
    };
    const htmlDown = renderToStaticMarkup(<MetricDeltaBadge delta={downNullDelta} />);
    expect(htmlDown).toContain("bg-error/15");
    expect(htmlDown).toContain("text-error");
    expect(htmlDown).toContain("border-error/30");
  });
});
