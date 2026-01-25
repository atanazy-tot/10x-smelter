/**
 * UI store for layout and visual state management.
 */

import { create } from "zustand";
import type { UIState } from "./types";

export const useUIStore = create<UIState>((set) => ({
  mobilePromptOverlayOpen: false,

  toggleMobilePromptOverlay: () => {
    set((state) => ({ mobilePromptOverlayOpen: !state.mobilePromptOverlayOpen }));
  },

  setMobilePromptOverlayOpen: (open: boolean) => {
    set({ mobilePromptOverlayOpen: open });
  },
}));
