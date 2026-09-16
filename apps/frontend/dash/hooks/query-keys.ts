export const boardKeys = {
  all: ["boards"] as const,
  list: (workspaceId: string) =>
    [...boardKeys.all, "list", workspaceId] as const,
  detail: (boardId: string) => [...boardKeys.all, "detail", boardId] as const,
};

export const moduleKeys = {
  all: ["modules"] as const,
  list: (workspaceId: string) =>
    [...moduleKeys.all, "list", workspaceId] as const,
};

export const commentKeys = {
  all: ["taskComments"] as const,
  list: (taskId: string) => [...commentKeys.all, "list", taskId] as const,
};

export const activityKeys = {
  all: ["taskActivity"] as const,
  list: (taskId: string) => [...activityKeys.all, "list", taskId] as const,
};

export const searchKeys = {
  all: ["search"] as const,
  query: (workspaceId: string, q: string) => [...searchKeys.all, workspaceId, q] as const,
};

export const scheduleKeys = {
  all: ["schedules"] as const,
  list: (workspaceId: string, filters?: Record<string, unknown>) =>
    [...scheduleKeys.all, "list", workspaceId, filters || {}] as const,
};

export const homeKeys = {
  all: ["home"] as const,
  detail: (workspaceId: string) => [...homeKeys.all, "detail", workspaceId] as const,
};
