import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCrewPresenceSection } from "../HomeCrewPresenceSection";
import { WorkspaceRoleEnum } from "@crwsync/types";
import type { HomeMemberPresence } from "@crwsync/types";

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

function makeMember(overrides: Partial<HomeMemberPresence> = {}): HomeMemberPresence {
  return {
    id: "member-1",
    name: "Riley Ocean",
    role: WorkspaceRoleEnum.MEMBER,
    isOnline: true,
    ...overrides,
  };
}

describe("HomeCrewPresenceSection", () => {
  it("renders member names, role pills, and online indicators", () => {
    const html = renderToStaticMarkup(
      <HomeCrewPresenceSection crew={[makeMember(), makeMember({ id: "member-2", name: "Sam Tide", isOnline: false })]} slug="acme" />
    );
    expect(html).toContain("Riley Ocean");
    expect(html).toContain("Sam Tide");
    expect(html).toContain("member");
    expect(html).toContain("bg-success");
    expect(html).toContain("bg-muted-foreground/40");
    expect(html).toContain("1 online");
  });

  it("invokes onDirectMessage(member) when the message button is clicked", () => {
    const onDirectMessage = vi.fn();
    const member = makeMember({ id: "member-42" });
    const tree = HomeCrewPresenceSection({ crew: [member], slug: "acme", onDirectMessage });
    const messageButton = findByTestId(tree, "home-crew-message-button");
    expect(messageButton).not.toBeNull();
    (messageButton?.props.onClick as () => void)();
    expect(onDirectMessage).toHaveBeenCalledWith(member);
  });

  it("renders the empty state when crew is empty or undefined", () => {
    const html = renderToStaticMarkup(<HomeCrewPresenceSection crew={[]} slug="acme" />);
    expect(html).toContain("No crew members found.");

    const tree = HomeCrewPresenceSection({ slug: "acme" });
    expect(findByTestId(tree, "home-crew-empty-state")).not.toBeNull();
  });
});
