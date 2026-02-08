import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LSidebarState {
  open: boolean;
  toggleOpen: () => void;
}

export const useLSidebar = create<LSidebarState>()(
  persist(
    (set) => ({
      open: true,
      toggleOpen: () => set((state) => ({ open: !state.open })),
    }),
    {
      name: "l-sidebar-state"
    }
  )
);