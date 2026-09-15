import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { scheduleKeys } from "@/hooks/query-keys";
import { getSchedules } from "@/services/schedule.service";
import { api } from "@/services/auth.service";
import { TaskPriorityEnum } from "@crwsync/types";

vi.mock("@/services/auth.service", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("scheduleKeys", () => {
  it("generates root schedule key", () => {
    expect(scheduleKeys.all).toEqual(["schedules"]);
  });

  it("generates list key with default empty filters", () => {
    expect(scheduleKeys.list("ws-123")).toEqual([
      "schedules",
      "list",
      "ws-123",
      {},
    ]);
  });

  it("generates list key with provided filters", () => {
    const filters = {
      scope: "assigned_to_me",
      boardId: "board-456",
      priority: TaskPriorityEnum.HIGH,
      includeCompleted: true,
      from: "2026-09-01",
      to: "2026-09-30",
    };

    expect(scheduleKeys.list("ws-123", filters)).toEqual([
      "schedules",
      "list",
      "ws-123",
      filters,
    ]);
  });
});

describe("getSchedules service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully fetches schedules and returns response data", async () => {
    const mockData = {
      tasks: [
        {
          id: "task-1",
          title: "Schedule Task",
          column: { id: "col-1", name: "In Progress", type: "IN_PROGRESS", color: null, board_id: "b-1" },
          board: { id: "b-1", name: "Engineering" },
          assignee: null,
        },
      ],
      counts: {
        overdue: 0,
        today: 1,
        thisWeek: 1,
        completedThisWeek: 0,
        total: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockData,
      },
    });

    const result = await getSchedules("ws-123", { scope: "assigned_to_me" });

    expect(api.get).toHaveBeenCalledWith("/workspaces/ws-123/boards/schedules", {
      params: { scope: "assigned_to_me" },
    });
    expect(result).toEqual({
      success: true,
      data: mockData,
    });
  });

  it("handles Axios error and returns error message", async () => {
    const axiosError = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        data: { message: "Invalid workspace ID" },
        headers: {},
        config: { headers: new AxiosHeaders() },
      },
    );

    vi.mocked(api.get).mockRejectedValueOnce(axiosError);

    const result = await getSchedules("ws-invalid");

    expect(result).toEqual({
      success: false,
      message: "Invalid workspace ID",
    });
  });

  it("handles unexpected generic error", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network failure"));

    const result = await getSchedules("ws-123");

    expect(result).toEqual({
      success: false,
      message: "An unexpected error occurred",
    });
  });
});
