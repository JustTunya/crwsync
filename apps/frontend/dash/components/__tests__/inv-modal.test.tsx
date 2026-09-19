import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import InviteMemberModal from "../inv-modal";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="invite-modal" className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-search-user", () => ({
  useSearchUsers: () => ({
    users: [],
  }),
}));

vi.mock("@/services/workspace.service", () => ({
  inviteMember: vi.fn().mockResolvedValue({ success: true }),
  getWorkspacePendingInvites: vi.fn().mockResolvedValue({ success: true, data: [] }),
  revokeInvite: vi.fn().mockResolvedValue({ success: true }),
}));

describe("InviteMemberModal", () => {
  it("renders nothing when isOpen is false", () => {
    const html = renderToStaticMarkup(
      <InviteMemberModal workspace={{ id: "ws-1", name: "Engineers" }} isOpen={false} onClose={vi.fn()} />
    );
    expect(html).toBe("");
  });

  it("renders modal header, tab toggles, and search bar when open", () => {
    const html = renderToStaticMarkup(
      <InviteMemberModal workspace={{ id: "ws-1", name: "Engineers" }} isOpen={true} onClose={vi.fn()} />
    );
    expect(html).toContain("Invite to Engineers");
    expect(html).toContain("Invite Member");
    expect(html).toContain("Pending Invites");
    expect(html).toContain("Search by username or email...");
    expect(html).toContain("Real-time Collaboration");
  });
});
