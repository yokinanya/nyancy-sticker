"use client";

import { useDeferredValue, useEffect, useMemo } from "react";
import { defaultGalleryCategoryId } from "@/lib/categories";
import { useFilterStore } from "@/lib/store";
import type { Category } from "@/lib/types";

export interface GalleryFilters {
  readonly category: string | null;
  readonly clearTags: () => void;
  readonly deferredCategory: string | null;
  readonly deferredQuery: string;
  readonly deferredTags: readonly string[];
  readonly isFiltering: boolean;
  readonly query: string;
  readonly setCategory: (value: string | null) => void;
  readonly setQuery: (value: string) => void;
  readonly tags: readonly string[];
  readonly toggleTag: (value: string) => void;
}

interface GalleryFilterOptions {
  readonly characterId: string;
  readonly categories: readonly Category[];
  readonly showAllCategoryTab: boolean;
}

export function useGalleryFilters(
  options: GalleryFilterOptions,
): GalleryFilters {
  const scopeId = useFilterStore((state) => state.scopeId);
  const storeQuery = useFilterStore((state) => state.query);
  const storeCategory = useFilterStore((state) => state.category);
  const storeTags = useFilterStore((state) => state.tags);
  const setGalleryScope = useFilterStore((state) => state.setGalleryScope);
  const setQuery = useFilterStore((state) => state.setQuery);
  const setCategory = useFilterStore((state) => state.setCategory);
  const toggleTag = useFilterStore((state) => state.toggleTag);
  const clearTags = useFilterStore((state) => state.clearTags);
  const defaultCategory = useMemo(
    () => defaultGalleryCategoryId(options.categories, options.showAllCategoryTab),
    [options.categories, options.showAllCategoryTab],
  );
  const currentScope = scopeId === options.characterId;
  const query = currentScope ? storeQuery : "";
  const category = currentScope ? storeCategory : defaultCategory;
  const tags = currentScope ? storeTags : [];
  const deferredQuery = useDeferredValue(query);
  const deferredCategory = useDeferredValue(category);
  const deferredTags = useDeferredValue(tags);

  useEffect(() => {
    setGalleryScope(options.characterId, defaultCategory);
  }, [defaultCategory, options.characterId, setGalleryScope]);
  useGlobalSearchShortcut();

  return {
    category,
    clearTags,
    deferredCategory,
    deferredQuery,
    deferredTags,
    isFiltering:
      deferredQuery !== query ||
      deferredCategory !== category ||
      deferredTags !== tags,
    query,
    setCategory,
    setQuery,
    tags,
    toggleTag,
  };
}

function useGlobalSearchShortcut(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      if (event.target instanceof HTMLInputElement) return;
      if (event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      document.querySelector<HTMLInputElement>("input[type='search']")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
