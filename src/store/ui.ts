/**
 * UI store for layout and visual state management.
 */

import { create } from "zustand";
import type { UIState } from "./types";

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  mobilePromptOverlayOpen: false,

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  toggleMobilePromptOverlay: () => {
    set((state) => ({ mobilePromptOverlayOpen: !state.mobilePromptOverlayOpen }));
  },

  setMobilePromptOverlayOpen: (open: boolean) => {
    set({ mobilePromptOverlayOpen: open });
  },
}));
