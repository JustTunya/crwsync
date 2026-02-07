import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { UserType } from "@crwsync/types";
import { getUsersByIdentifier } from "@/services/user.service";

export function useSearchUsers(identifier: string): { users: UserType[]; } {
  const [debounced] = useDebounce(identifier, 500);
  const [users, setUsers] = useState<UserType[]>([]);

  const term = debounced.trim();

  useEffect(() => {
    if (!term) return;

    let isCancelled = false;

    const search = async () => {
      try {
        const result = await getUsersByIdentifier(term);
        if (!isCancelled && result.success) {
          setUsers(result.data || []);
        }
      } catch {
        if (!isCancelled) {
          setUsers([]);
        }
      }
    };

    search();

    return () => {
      isCancelled = true;
    };
  }, [term]);

  if (!term) {
    return { users: [] };
  }

  return { users };
}