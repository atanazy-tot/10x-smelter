/**
 * Prompt store for prompt selection and management.
 */

import { create } from "zustand";
import type { PromptState } from "./types";
import type {
  DefaultPromptName,
  PromptDTO,
  PromptsListDTO,
  PromptSectionsListDTO,
  PromptSectionWithCountDTO,
} from "@/types";
import { apiFetch } from "@/lib/utils/api-client";

export const usePromptStore = create<PromptState>((set, get) => ({
  selectedPredefinedPrompts: [],
  selectedCustomPromptId: null,
  customPrompts: [],
  sections: [],
  isLoading: false,
  editorOpen: false,
  editingPrompt: null,
  sectionDialogOpen: false,
  editingSection: null,

  togglePredefinedPrompt: (name: DefaultPromptName) => {
    set((state) => {
      const isSelected = state.selectedPredefinedPrompts.includes(name);
      if (isSelected) {
        return {
          selectedPredefinedPrompts: state.selectedPredefinedPrompts.filter((n) => n !== name),
        };
      } else {
        return {
          selectedPredefinedPrompts: [...state.selectedPredefinedPrompts, name],
          // Clear custom prompt when selecting predefined
          selectedCustomPromptId: null,
        };
      }
    });
  },

  selectCustomPrompt: (id: string | null) => {
    set({
      selectedCustomPromptId: id,
      // Clear predefined prompts when selecting custom
      selectedPredefinedPrompts: id ? [] : get().selectedPredefinedPrompts,
    });
  },

  loadPrompts: async () => {
    set({ isLoading: true });
    try {
      const response = await apiFetch("/api/prompts?limit=100");
      if (response.ok) {
        const data: PromptsListDTO = await response.json();
        set({ customPrompts: data.prompts });
      }
    } catch {
      // Silently fail
    } finally {
      set({ isLoading: false });
    }
  },

  loadSections: async () => {
    try {
      const response = await apiFetch("/api/prompt-sections");
      if (response.ok) {
        const data: PromptSectionsListDTO = await response.json();
        set({ sections: data.sections });
      }
    } catch {
      // Silently fail
    }
  },

  setEditorOpen: (open: boolean) => {
    set({ editorOpen: open });
    if (!open) {
      set({ editingPrompt: null });
    }
  },

  setEditingPrompt: (prompt: PromptDTO | null) => {
    set({ editingPrompt: prompt, editorOpen: prompt !== null });
  },

  createPrompt: async (title: string, body: string, sectionId?: string) => {
    const response = await apiFetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, section_id: sectionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create prompt");
    }

    const prompt: PromptDTO = await response.json();
    set((state) => ({
      customPrompts: [...state.customPrompts, prompt],
      editorOpen: false,
      editingPrompt: null,
    }));

    // Reload sections to update counts
    get().loadSections();

    return prompt;
  },

  updatePrompt: async (id: string, title: string, body: string, sectionId?: string | null) => {
    const payload: { title: string; body: string; section_id?: string | null } = { title, body };
    if (sectionId !== undefined) {
      payload.section_id = sectionId;
    }

    const response = await apiFetch(`/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update prompt");
    }

    const prompt: PromptDTO = await response.json();
    set((state) => ({
      customPrompts: state.customPrompts.map((p) => (p.id === id ? prompt : p)),
      editorOpen: false,
      editingPrompt: null,
    }));

    // Reload sections to update counts
    get().loadSections();

    return prompt;
  },

  deletePrompt: async (id: string) => {
    const response = await apiFetch(`/api/prompts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete prompt");
    }

    set((state) => ({
      customPrompts: state.customPrompts.filter((p) => p.id !== id),
      selectedCustomPromptId: state.selectedCustomPromptId === id ? null : state.selectedCustomPromptId,
    }));

    // Reload sections to update counts
    get().loadSections();
  },

  hasSelection: (): boolean => {
    const state = get();
    return state.selectedPredefinedPrompts.length > 0 || state.selectedCustomPromptId !== null;
  },

  // Section dialog management
  setSectionDialogOpen: (open: boolean) => {
    set({ sectionDialogOpen: open });
    if (!open) {
      set({ editingSection: null });
    }
  },

  setEditingSection: (section: PromptSectionWithCountDTO | null) => {
    set({ editingSection: section, sectionDialogOpen: section !== null });
  },

  createSection: async (title: string) => {
    const response = await apiFetch("/api/prompt-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create section");
    }

    const section: PromptSectionWithCountDTO = await response.json();
    set((state) => ({
      sections: [...state.sections, { ...section, prompt_count: 0 }],
      sectionDialogOpen: false,
      editingSection: null,
    }));

    return section;
  },

  updateSection: async (id: string, title: string) => {
    const response = await apiFetch(`/api/prompt-sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update section");
    }

    const section: PromptSectionWithCountDTO = await response.json();
    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...section, prompt_count: s.prompt_count } : s)),
      sectionDialogOpen: false,
      editingSection: null,
    }));

    return section;
  },

  deleteSection: async (id: string) => {
    const response = await apiFetch(`/api/prompt-sections/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete section");
    }

    // Move prompts from deleted section to unsorted
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
      customPrompts: state.customPrompts.map((p) => (p.section_id === id ? { ...p, section_id: null } : p)),
    }));
  },

  // Drag and drop
  movePromptToSection: async (promptId: string, sectionId: string | null) => {
    const prompt = get().customPrompts.find((p) => p.id === promptId);
    if (!prompt || prompt.section_id === sectionId) {
      return; // No change needed
    }

    // Optimistic update
    set((state) => ({
      customPrompts: state.customPrompts.map((p) => (p.id === promptId ? { ...p, section_id: sectionId } : p)),
    }));

    try {
      const response = await apiFetch(`/api/prompts/${promptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId }),
      });

      if (!response.ok) {
        // Revert on failure
        set((state) => ({
          customPrompts: state.customPrompts.map((p) =>
            p.id === promptId ? { ...p, section_id: prompt.section_id } : p
          ),
        }));
        throw new Error("Failed to move prompt");
      }

      // Reload sections to update counts
      get().loadSections();
    } catch {
      // Revert on failure
      set((state) => ({
        customPrompts: state.customPrompts.map((p) =>
          p.id === promptId ? { ...p, section_id: prompt.section_id } : p
        ),
      }));
    }
  },
}));
