import { describe, it, expect } from "vitest";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { formatDate, formatRelativeTime } from "./utils/format-date";
import { formatNumber, formatCompactNumber } from "./utils/format-number";

describe("i18n package", () => {
  it("has matching top-level translation namespaces across locales", () => {
    expect(Object.keys(en)).toEqual(Object.keys(es));
  });

  it("has matching translation keys across all namespaces", () => {
    const namespaces = Object.keys(en) as (keyof typeof en)[];
    for (const ns of namespaces) {
      expect(Object.keys(en[ns])).toEqual(Object.keys(es[ns]));
    }
  });

  it("formats dates correctly with Intl.DateTimeFormat", () => {
    const date = new Date("2026-09-14T12:00:00Z");
    const formattedEn = formatDate(date, { year: "numeric", month: "numeric", day: "numeric" }, "en");
    expect(formattedEn).toBeTruthy();
    expect(formattedEn).toContain("2026");

    const invalidDate = formatDate("invalid-date");
    expect(invalidDate).toBe("");
  });

  it("formats relative time correctly with Intl.RelativeTimeFormat", () => {
    const now = Date.now();
    const pastMinute = new Date(now - 65 * 1000);
    const formatted = formatRelativeTime(pastMinute, "en");
    expect(formatted).toMatch(/minute|min/i);

    const invalid = formatRelativeTime("invalid-date");
    expect(invalid).toBe("");
  });

  it("formats numbers and compact numbers correctly", () => {
    const num = formatNumber(12500, undefined, "en");
    expect(num).toContain("12,500");

    const compact = formatCompactNumber(1500000, "en");
    expect(compact).toMatch(/1\.5M|1\.5\s*M/);
  });

  it("has complete translations with parameters in chat and a11y namespaces", () => {
    expect(en.chat.typingSingle).toContain("{user}");
    expect(es.chat.typingSingle).toContain("{user}");
    expect(en.a11y.taskMoved).toContain("{title}");
    expect(en.a11y.taskMoved).toContain("{column}");
    expect(es.a11y.taskMoved).toContain("{title}");
    expect(es.a11y.taskMoved).toContain("{column}");
  });
});
