import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { aiKeys } from "@/hooks/use-ai";
import { getAiJob, getAiStatus, summarizeRoom } from "@/services/ai.service";
import { api } from "@/services/auth.service";

vi.mock("@/services/auth.service", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const axiosError = (status: number, data: unknown) =>
  new AxiosError("fail", String(status), undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("aiKeys", () => {
  it("scopes job keys by workspace and job", () => {
    expect(aiKeys.status()).toEqual(["ai", "status"]);
    expect(aiKeys.job("ws-1", "job-1")).toEqual(["ai", "job", "ws-1", "job-1"]);
  });
});

describe("ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a summary job and returns its id", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { jobId: "job-1" } });

    const res = await summarizeRoom("ws-1", "room-1", 50);

    expect(api.post).toHaveBeenCalledWith("/workspaces/ws-1/ai/rooms/room-1/summary", { limit: 50 });
    expect(res).toEqual({ success: true, data: { jobId: "job-1" } });
  });

  it("flags the daily cap so the UI can show the rate-limited state", async () => {
    vi.mocked(api.post).mockRejectedValue(axiosError(429, { statusCode: 429, error: "Daily AI limit reached (20 requests per day). It resets at 00:00 UTC." }));

    const res = await summarizeRoom("ws-1", "room-1", 50);

    expect(res).toEqual({ success: false, rateLimited: true, message: "Daily AI limit reached (20 requests per day). It resets at 00:00 UTC." });
  });

  it("reads nested validation messages", async () => {
    vi.mocked(api.post).mockRejectedValue(axiosError(400, { error: { message: ["boardId must be a UUID"] } }));

    const res = await summarizeRoom("ws-1", "room-1", 50);

    expect(res).toMatchObject({ success: false, rateLimited: false, message: "boardId must be a UUID" });
  });

  it("returns the job status and treats a 404 as a failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { status: "pending" } });
    await expect(getAiJob("ws-1", "job-1")).resolves.toEqual({ success: true, data: { status: "pending" } });

    vi.mocked(api.get).mockRejectedValueOnce(axiosError(404, { error: { message: "Job not found" } }));
    await expect(getAiJob("ws-1", "job-1")).resolves.toMatchObject({ success: false, message: "Job not found" });
  });

  it("reports AI as unavailable when the status call fails", async () => {
    vi.mocked(api.get).mockRejectedValue(axiosError(404, { error: "Not Found" }));

    await expect(getAiStatus()).resolves.toMatchObject({ success: false });
  });
});
