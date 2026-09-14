import { describe, it, expect } from "vitest";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

describe("CreateWorkspace slugify helper", () => {
  it("converts spaces and uppercase to lowercase kebab-case", () => {
    expect(slugify("Acme Corporation")).toBe("acme-corporation");
    expect(slugify("Product & Engineering Team")).toBe("product-engineering-team");
  });

  it("strips special characters and trims duplicate hyphens", () => {
    expect(slugify("---My-Cool_Workspace!!!---")).toBe("my-cool-workspace");
    expect(slugify("Design   Studio 2026")).toBe("design-studio-2026");
  });

  it("handles empty or single word inputs gracefully", () => {
    expect(slugify("")).toBe("");
    expect(slugify("crwsync")).toBe("crwsync");
  });
});
