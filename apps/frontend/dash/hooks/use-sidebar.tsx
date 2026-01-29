import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  open: boolean;
  toggleOpen: () => void;
}

export const useSidebar = create<SidebarState>()(
  persist(
    (set) => ({
      open: true,
      toggleOpen: () => set((state) => ({ open: !state.open })),
    }),
    {
      name: "sidebar-state"
    }
  )
);