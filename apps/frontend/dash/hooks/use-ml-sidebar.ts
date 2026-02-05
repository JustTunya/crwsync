import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MlSidebarState {
  open: boolean;
  toggleOpen: () => void;
}

export const useMlSidebar = create<MlSidebarState>()(
  persist(
    (set) => ({
      open: true,
      toggleOpen: () => set((state) => ({ open: !state.open })),
    }),
    {
      name: "ml-sidebar-state"
    }
  )
);