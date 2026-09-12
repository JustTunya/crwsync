import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { CacheKeys, CacheTTL } from "src/redis/cache-keys";

interface TaskRow {
  id: string;
  short_id: string;
  title: string;
  board_id: string;
  board_name: string;
  column_name: string;
}

interface ChatRow {
  id: string;
  room_id: string;
  room_name: string | null;
  content: string;
  created_at: Date;
}

interface FileRow {
  id: string;
  file_name: string;
  file_room_id: string;
  file_room_name: string | null;
}

interface MemberRow {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  avatar_key: string | null;
  role: string;
}

export interface SearchResults {
  tasks: { id: string; shortId: string; title: string; boardId: string; boardName: string; columnName: string }[];
  chats: { id: string; roomId: string; roomName: string | null; content: string; createdAt: string }[];
  files: { id: string; fileName: string; fileRoomId: string; fileRoomName: string | null }[];
  members: { id: string; firstname: string; lastname: string; username: string; avatarKey: string | null; role: string }[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async search(workspaceId: string, q: string): Promise<{ success: true; data: SearchResults }> {
    const query = q.trim();
    const cacheKey = CacheKeys.workspaceSearch(workspaceId, query);
    const cached = await this.cache.get<{ success: true; data: SearchResults }>(cacheKey);
    if (cached) return cached;

    const likeParam = `%${query}%`;

    const [taskRows, chatRows, fileRows, memberRows] = await Promise.all([
      this.prisma.$queryRaw<TaskRow[]>`
        SELECT t.id, t.short_id, t.title, bc.board_id, b.name AS board_name, bc.name AS column_name
        FROM tasks t
        JOIN board_columns bc ON bc.id = t.column_id
        JOIN boards b ON b.id = bc.board_id
        WHERE t.workspace_id = ${workspaceId}::uuid
          AND t.is_deleted = false AND t.is_archived = false
          AND (t.search_vector @@ websearch_to_tsquery('english', ${query}) OR t.short_id ILIKE ${likeParam})
        ORDER BY ts_rank(t.search_vector, websearch_to_tsquery('english', ${query})) DESC
        LIMIT 5
      `,
      this.prisma.$queryRaw<ChatRow[]>`
        SELECT cm.id, cm.room_id, cr.name AS room_name, substring(cm.content, 1, 140) AS content, cm.created_at
        FROM chat_messages cm
        JOIN chat_rooms cr ON cr.id = cm.room_id
        WHERE cm.workspace_id = ${workspaceId}::uuid AND cm.is_deleted = false
          AND cm.search_vector @@ websearch_to_tsquery('english', ${query})
        ORDER BY ts_rank(cm.search_vector, websearch_to_tsquery('english', ${query})) DESC
        LIMIT 5
      `,
      this.prisma.$queryRaw<FileRow[]>`
        SELECT wf.id, wf.file_name, wf.file_room_id, fr.name AS file_room_name
        FROM workspace_files wf
        JOIN file_rooms fr ON fr.id = wf.file_room_id
        WHERE fr.workspace_id = ${workspaceId}::uuid AND similarity(wf.file_name, ${query}) > 0.2
        ORDER BY similarity(wf.file_name, ${query}) DESC
        LIMIT 5
      `,
      this.prisma.$queryRaw<MemberRow[]>`
        SELECT u.id, u.firstname, u.lastname, u.username, u.avatar_key, wm.role
        FROM users u
        JOIN workspace_members wm ON wm.user_id = u.id
        WHERE wm.workspace_id = ${workspaceId}::uuid
          AND (similarity(u.firstname || ' ' || u.lastname, ${query}) > 0.2
               OR u.username ILIKE ${likeParam} OR u.email ILIKE ${likeParam})
        ORDER BY similarity(u.firstname || ' ' || u.lastname, ${query}) DESC
        LIMIT 5
      `,
    ]);

    const result: { success: true; data: SearchResults } = {
      success: true,
      data: {
        tasks: taskRows.map((t) => ({
          id: t.id,
          shortId: t.short_id,
          title: t.title,
          boardId: t.board_id,
          boardName: t.board_name,
          columnName: t.column_name,
        })),
        chats: chatRows.map((c) => ({
          id: c.id,
          roomId: c.room_id,
          roomName: c.room_name,
          content: c.content,
          createdAt: c.created_at.toISOString(),
        })),
        files: fileRows.map((f) => ({
          id: f.id,
          fileName: f.file_name,
          fileRoomId: f.file_room_id,
          fileRoomName: f.file_room_name,
        })),
        members: memberRows.map((m) => ({
          id: m.id,
          firstname: m.firstname,
          lastname: m.lastname,
          username: m.username,
          avatarKey: m.avatar_key,
          role: m.role,
        })),
      },
    };

    await this.cache.set(cacheKey, result, CacheTTL.SEARCH);
    return result;
  }
}
