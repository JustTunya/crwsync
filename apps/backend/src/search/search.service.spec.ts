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

    const result = await service.search("ws-1", "ship");

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

  it("returns empty arrays instead of throwing on a SQL-injection-shaped query", async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.search("ws-1", "' OR 1=1--");

    expect(result.success).toBe(true);
    expect(result.data.tasks).toEqual([]);
    expect(result.data.chats).toEqual([]);
    expect(result.data.files).toEqual([]);
    expect(result.data.members).toEqual([]);
  });

  it("caches the result and returns the cached value on a repeat query", async () => {
    const { service, prisma, cache } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce({
      success: true,
      data: { tasks: [], chats: [], files: [], members: [] },
    });

    await service.search("ws-1", "ship");
    await service.search("ws-1", "ship");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4); // only the first call hits Postgres
    expect(cache.set).toHaveBeenCalledTimes(1);
  });
});
