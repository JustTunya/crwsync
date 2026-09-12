export const CacheKeys = {
  session: (id: string) => `session:${id}`,
  user: (id: string) => `user:${id}`,
  userByIdentifier: (identifier: string) => `user:identifier:${identifier.toLowerCase()}`,
  userWorkspaces: (userId: string) => `user:${userId}:workspaces`,
  workspace: (id: string) => `workspace:${id}`,
  workspaceSlug: (slug: string) => `workspace:slug:${slug.toLowerCase()}`,
  workspaceMember: (workspaceId: string, userId: string) => `workspace:${workspaceId}:member:${userId}`,
  verification: (email: string) => `verification:${email.toLowerCase()}`,
  workspaceSearch: (workspaceId: string, userId: string, q: string) =>
    `workspace:${workspaceId}:user:${userId}:search:${q.toLowerCase().trim()}`,
};

export const CacheTTL = {
  SESSION: 300, // 5 minutes
  USER: 600, // 10 minutes
  WORKSPACE: 600, // 10 minutes
  WORKSPACE_MEMBER: 600, // 10 minutes
  USER_WORKSPACES: 600, // 10 minutes
  VERIFICATION: 300, // 5 minutes
  SEARCH: 30, // 30 seconds
};
