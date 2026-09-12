import { SearchService } from "./search.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";

function makeService() {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };
  return {
    service: new SearchService(prisma as unknown as PrismaService, cache as unknown as CacheService),
    prisma,
    cache,
  };
}

describe("SearchService", () => {
  it("runs all four entity queries scoped by workspaceId and caps each at 5 rows", async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: "t1", short_id: "CRW-1", title: "Ship it", board_id: "b1", board_name: "Main", column_name: "Todo" }])
      .mockResolvedValueOnce([{ id: "m1", room_id: "r1", room_name: "General", content: "hello", created_at: new Date("2026-01-01") }])
      .mockResolvedValueOnce([{ id: "f1", file_name: "spec.pdf", file_room_id: "fr1", file_room_name: "Docs" }])
      .mockResolvedValueOnce([{ id: "u1", firstname: "Ada", lastname: "Lovelace", username: "ada", avatar_key: null, role: "MEMBER" }]);

    const result = await service.search("ws-1", "u1", "ship");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      success: true,
      data: {
        tasks: [{ id: "t1", shortId: "CRW-1", title: "Ship it", boardId: "b1", boardName: "Main", columnName: "Todo" }],
        chats: [{ id: "m1", roomId: "r1", roomName: "General", content: "hello", createdAt: new Date("2026-01-01").toISOString() }],
        files: [{ id: "f1", fileName: "spec.pdf", fileRoomId: "fr1", fileRoomName: "Docs" }],
        members: [{ id: "u1", firstname: "Ada", lastname: "Lovelace", username: "ada", avatarKey: null, role: "MEMBER" }],
      },
    });
  });

  it("parameterizes a SQL-injection-shaped query instead of concatenating it into the SQL", async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);
    const injection = "' OR 1=1--";

    const result = await service.search("ws-1", "u1", injection);

    expect(result.success).toBe(true);
    expect(result.data.tasks).toEqual([]);
    expect(result.data.chats).toEqual([]);
    expect(result.data.files).toEqual([]);
    expect(result.data.members).toEqual([]);

    const [tasksFragments, ...tasksValues] = prisma.$queryRaw.mock.calls[0];
    expect(tasksFragments.some((fragment: string) => fragment.includes(injection))).toBe(false);
    expect(tasksValues).toContain(injection);
  });

  it("scopes the chats query to the caller's own DMs by passing userId as an interpolated value", async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);

    await service.search("ws-1", "user-42", "ship");

    const [, ...chatsValues] = prisma.$queryRaw.mock.calls[1];
    expect(chatsValues).toContain("user-42");
  });

  it("caches the result and returns the cached value on a repeat query", async () => {
    const { service, prisma, cache } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce({
      success: true,
      data: { tasks: [], chats: [], files: [], members: [] },
    });

    await service.search("ws-1", "u1", "ship");
    await service.search("ws-1", "u1", "ship");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4); // only the first call hits Postgres
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it("returns empty arrays without querying or caching on a whitespace-only query", async () => {
    const { service, prisma, cache } = makeService();

    const result = await service.search("ws-1", "u1", "   ");

    expect(result).toEqual({
      success: true,
      data: { tasks: [], chats: [], files: [], members: [] },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });
});
