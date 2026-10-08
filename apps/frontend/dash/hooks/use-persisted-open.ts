"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "crwsync:persisted-open";

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function usePersistedOpen(key: string) {
  const open = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) !== "0";
      } catch {
        return true;
      }
    },
    () => true
  );

  const setOpen = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );

  return [open, setOpen] as const;
}
