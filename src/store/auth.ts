/**
 * Authentication store for user session and usage tracking.
 */

import { create } from "zustand";
import type { AuthState } from "./types";
import type { UsageDTO, SessionDTO } from "@/types";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  usage: null,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  setUsage: (usage) => set({ usage }),

  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors
    }
    set({
      user: null,
      isAuthenticated: false,
      usage: null,
    });
    // Refresh usage to get anonymous limits
    get().refreshUsage();
  },

  refreshUsage: async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const usage: UsageDTO = await response.json();
        set({ usage });
      }
    } catch {
      // Silently fail - usage will be stale
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Fetch session and usage in parallel
      const [sessionRes, usageRes] = await Promise.all([fetch("/api/auth/session"), fetch("/api/usage")]);

      if (sessionRes.ok) {
        const session: SessionDTO = await sessionRes.json();
        if (session.authenticated) {
          set({
            user: session.user,
            isAuthenticated: true,
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      }

      if (usageRes.ok) {
        const usage: UsageDTO = await usageRes.json();
        set({ usage });
      }
    } catch {
      // On error, assume anonymous
      set({
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
