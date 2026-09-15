import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { statisticsKeys } from "@/hooks/use-statistics";
import { getWorkspaceStatistics } from "@/services/statistics.service";
import { api } from "@/services/auth.service";
import type { StatisticsQueryParams, WorkspaceStatisticsData } from "@crwsync/types";

vi.mock("@/services/auth.service", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("statisticsKeys", () => {
  it("generates root statistics key", () => {
    expect(statisticsKeys.all).toEqual(["statistics"]);
  });

  it("generates detail key with default empty params", () => {
    expect(statisticsKeys.detail("ws-123")).toEqual([
      "statistics",
      "ws-123",
      {},
    ]);
  });

  it("generates detail key with custom query params", () => {
    const params: StatisticsQueryParams = {
      interval: "30d",
      projectId: "proj-1",
      boardId: "board-2",
    };

    expect(statisticsKeys.detail("ws-123", params)).toEqual([
      "statistics",
      "ws-123",
      params,
    ]);
  });
});

describe("getWorkspaceStatistics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches workspace statistics with params successfully", async () => {
    const mockData = {
      interval: "30d",
      summary: {
        velocity: { current: 10, previous: 8, deltaPercent: 25, trend: "up", sentiment: "positive" },
        created: { current: 15, previous: 12, deltaPercent: 25, trend: "up", sentiment: "positive" },
        throughputRatio: { current: 66.7, previous: 66.7, deltaPercent: 0, trend: "neutral", sentiment: "neutral" },
        cycleTimeSeconds: { current: 86400, previous: 172800, deltaPercent: -50, trend: "down", sentiment: "positive" },
        overdueTasks: { current: 1, previous: 3, deltaPercent: -66.7, trend: "down", sentiment: "positive" },
        completionRate: { current: 80, previous: 70, deltaPercent: 14.3, trend: "up", sentiment: "positive" },
      },
      timeseries: [],
      memberWorkloads: [],
      priorityDistribution: { urgent: 1, high: 2, medium: 3, low: 4, none: 0 },
      statusDistribution: { upcoming: 2, ongoing: 5, complete: 8 },
      personal: {
        activeWorkload: 3,
        velocity: { current: 5, previous: 4, deltaPercent: 25, trend: "up", sentiment: "positive" },
        cycleTimeSeconds: { current: 43200, previous: 86400, deltaPercent: -50, trend: "down", sentiment: "positive" },
        onTimeRate: { current: 100, previous: 100, deltaPercent: 0, trend: "neutral", sentiment: "neutral" },
        activityHeatmap: [],
        streakDays: 4,
        totalActiveDays: 12,
      },
      projects: [],
    } as WorkspaceStatisticsData;

    vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });

    const params: StatisticsQueryParams = { interval: "30d", projectId: "p-1" };
    const result = await getWorkspaceStatistics("ws-123", params);

    expect(api.get).toHaveBeenCalledWith("/workspaces/ws-123/statistics", {
      params,
    });
    expect(result).toEqual(mockData);
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

    await expect(getWorkspaceStatistics("ws-invalid")).rejects.toThrow("Workspace not found");
  });

  it("handles Axios error without response data message fallback", async () => {
    const axiosError = new AxiosError(
      "Request failed",
      "ERR_NETWORK",
      undefined,
      undefined,
      undefined
    );

    vi.mocked(api.get).mockRejectedValueOnce(axiosError);

    await expect(getWorkspaceStatistics("ws-123")).rejects.toThrow("Failed to fetch workspace statistics");
  });

  it("handles non-Axios unexpected error", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Unexpected crash"));

    await expect(getWorkspaceStatistics("ws-123")).rejects.toThrow("An unexpected error occurred");
  });
});
