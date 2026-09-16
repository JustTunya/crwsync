import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomePinnedModulesSection } from "../HomePinnedModulesSection";
import { ModuleTypeEnum } from "@crwsync/types";
import type { HomePinnedModule } from "@crwsync/types";

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

function makeModule(overrides: Partial<HomePinnedModule> & { reference_id?: string } = {}) {
  return {
    id: "mod-1",
    name: "Sprint Board",
    type: ModuleTypeEnum.BOARD,
    isPinned: true,
    color: "#f97316",
    badgeCount: 3,
    reference_id: "board-99",
    ...overrides,
  };
}

describe("HomePinnedModulesSection", () => {
  it("renders module names, subtitles, and icons", () => {
    const html = renderToStaticMarkup(
      <HomePinnedModulesSection modules={[makeModule()]} slug="acme" />
    );
    expect(html).toContain("Sprint Board");
    expect(html).toContain("3 items");
    expect(html).toContain("<svg");
  });

  it("falls back to the lowercase module type when there is no badge count", () => {
    const html = renderToStaticMarkup(
      <HomePinnedModulesSection
        modules={[makeModule({ badgeCount: undefined, type: ModuleTypeEnum.CHAT })]}
        slug="acme"
      />
    );
    expect(html).toContain("chat");
  });

  it("renders the count badge based on the modules array length", () => {
    const html = renderToStaticMarkup(
      <HomePinnedModulesSection
        modules={[makeModule({ id: "m1" }), makeModule({ id: "m2" })]}
        slug="acme"
      />
    );
    expect(html).toContain(">2<");
  });

  it("generates valid module link hrefs from the workspace slug and module type", () => {
    const html = renderToStaticMarkup(
      <HomePinnedModulesSection
        modules={[makeModule({ type: ModuleTypeEnum.CHAT, reference_id: "chat-7" })]}
        slug="acme"
      />
    );
    expect(html).toContain('href="/acme/chat/chat-7"');
  });

  it("invokes onUnpinModule(mod.id) when the unpin button is clicked", () => {
    const onUnpinModule = vi.fn();
    const tree = HomePinnedModulesSection({
      modules: [makeModule({ id: "mod-42" })],
      slug: "acme",
      onUnpinModule,
    });
    const unpinButton = findByTestId(tree, "home-pinned-module-unpin");
    expect(unpinButton).not.toBeNull();
    (
      unpinButton?.props.onClick as (e: { preventDefault: () => void; stopPropagation: () => void }) => void
    )({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
    expect(onUnpinModule).toHaveBeenCalledWith("mod-42");
  });

  it("renders the empty state when modules array is empty", () => {
    const html = renderToStaticMarkup(<HomePinnedModulesSection modules={[]} slug="acme" />);
    expect(html).toContain("No pinned modules yet. Pin a module from the sidebar for quick access.");
    const tree = HomePinnedModulesSection({ modules: [], slug: "acme" });
    expect(findByTestId(tree, "home-pinned-modules-empty-state")).not.toBeNull();
  });

  it("renders the empty state when modules is undefined", () => {
    const tree = HomePinnedModulesSection({ slug: "acme" });
    expect(findByTestId(tree, "home-pinned-modules-empty-state")).not.toBeNull();
  });
});
