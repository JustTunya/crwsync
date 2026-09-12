import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { searchKeys } from "@/hooks/query-keys";
import { searchWorkspace } from "@/services/search.service";

export function useOmniSearch(workspaceId: string | undefined, query: string) {
  const [debounced] = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: searchKeys.query(workspaceId || "", debounced),
    queryFn: () => searchWorkspace(workspaceId!, debounced),
    enabled: !!workspaceId && debounced.length >= 2,
    staleTime: 10_000,
    select: (result) => result.data,
  });
}
