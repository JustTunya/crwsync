import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { homeKeys } from "@/hooks/query-keys";
import { getWorkspaceHome } from "@/services/home.service";
import { api } from "@/services/auth.service";
import type { WorkspaceHomeData } from "@crwsync/types";

vi.mock("@/services/auth.service", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("homeKeys", () => {
  it("generates root home key", () => {
    expect(homeKeys.all).toEqual(["home"]);
  });

  it("generates detail key for a workspace", () => {
    expect(homeKeys.detail("ws-1")).toEqual(["home", "detail", "ws-1"]);
  });
});

describe("getWorkspaceHome service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches workspace home data successfully", async () => {
    const mockData = {
      summary: {},
      myFocus: { overdue: [], dueToday: [], inProgress: [] },
      projects: [],
    } as unknown as WorkspaceHomeData;

    vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });

    const result = await getWorkspaceHome("ws-1");

    expect(api.get).toHaveBeenCalledWith("/workspaces/ws-1/home");
    expect(result).toEqual({ success: true, data: mockData });
  });

  it("handles Axios error and extracts error message", async () => {
    const axiosError = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 404,
        statusText: "Not Found",
        data: { message: "Workspace not found" },
        headers: {},
        config: { headers: new AxiosHeaders() },
      }
    );

    vi.mocked(api.get).mockRejectedValueOnce(axiosError);

    const result = await getWorkspaceHome("ws-invalid");

    expect(result).toEqual({ success: false, message: "Workspace not found" });
  });

  it("handles network error fallback", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network down"));

    const result = await getWorkspaceHome("ws-1");

    expect(result).toEqual({ success: false, message: "An unexpected error occurred" });
  });
});
