import { useQuery } from "@tanstack/react-query";
import { getWorkspaceHome } from "@/services/home.service";
import { homeKeys } from "@/hooks/query-keys";

export { homeKeys } from "@/hooks/query-keys";

export function useWorkspaceHome(workspaceId?: string) {
  return useQuery({
    queryKey: homeKeys.detail(workspaceId || ""),
    queryFn: async () => {
      const res = await getWorkspaceHome(workspaceId!);
      if (!res.success) {
        throw new Error(res.message || "Failed to load home data");
      }
      return res.data;
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
  });
}
