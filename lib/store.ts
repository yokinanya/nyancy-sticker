"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FilterState {
  query: string;
  category: string | null;
  tags: string[];
  recents: string[];
  setQuery: (q: string) => void;
  setCategory: (c: string | null) => void;
  toggleTag: (t: string) => void;
  clearTags: () => void;
  pushRecent: (id: string) => void;
  reset: () => void;
}

const MAX_RECENTS = 24;

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      query: "",
      category: null,
      tags: [],
      recents: [],
      setQuery: (q) => set({ query: q }),
      setCategory: (c) => set({ category: c }),
      toggleTag: (t) =>
        set((s) => ({
          tags: s.tags.includes(t) ? s.tags.filter((x) => x !== t) : [...s.tags, t],
        })),
      clearTags: () => set({ tags: [] }),
      pushRecent: (id) =>
        set((s) => ({
          recents: [id, ...s.recents.filter((x) => x !== id)].slice(0, MAX_RECENTS),
        })),
      reset: () => set({ query: "", category: null, tags: [] }),
    }),
    {
      name: "nyancy-filter",
      partialize: (s) => ({ recents: s.recents }),
    },
  ),
);
