import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RSidebarState {
  open: boolean;
  view: "MEMBERS" | "NOTIFICATIONS";
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setView: (view: "MEMBERS" | "NOTIFICATIONS") => void;
}

export const useRSidebar = create<RSidebarState>()(
  persist(
    (set) => ({
      open: true,
      view: "MEMBERS",
      toggleOpen: () => set((state) => ({ open: !state.open })),
      setOpen: (open: boolean) => set({ open }),
      setView: (view) => set({ view, open: true }),
    }),
    {
      name: "r-sidebar-state"
    }
  )
);