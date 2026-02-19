import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LSidebarState {
  open: boolean;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

export const useLSidebar = create<LSidebarState>()(
  persist(
    (set) => ({
      open: true,
      toggleOpen: () => set((state) => ({ open: !state.open })),
      setOpen: (open: boolean) => set({ open }),
    }),
    {
      name: "l-sidebar-state"
    }
  )
);