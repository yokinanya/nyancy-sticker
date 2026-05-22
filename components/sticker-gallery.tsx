"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { SearchBar } from "./search-bar";
import { CategoryTabs } from "./category-tabs";
import { TagFilter } from "./tag-filter";
import { StickerGrid } from "./sticker-grid";
import { StickerPreviewModal } from "./sticker-preview-modal";
import { useFilterStore } from "@/lib/store";
import { createFuse, filterStickers } from "@/lib/search";
import {
  countTagsByCategoryTree,
  countStickersByCategoryTree,
  createCategoryDescendantMap,
  defaultCategoryId,
  type CategoryTagCount,
} from "@/lib/categories";
import type { Category, Manifest, Sticker } from "@/lib/types";

interface Props {
  manifest: Manifest;
  characterId?: string;
  hideTopLevel?: boolean;
}

export function StickerGallery({
  manifest,
  characterId = "all",
  hideTopLevel = false,
}: Props) {
  const { categories, stickers } = manifest;
  const filters = useScopedFilters(characterId, categories);
  const fuse = useFuseIndex(stickers);
  const derived = useMemo(
    () => createGalleryDerivedData(categories, stickers),
    [categories, stickers],
  );
  const filtered = useFilteredStickers(stickers, fuse, filters, derived.descendantMap);
  const topTags = useMemo(
    () => getTopTags(derived.tagsByCategory, filters.category),
    [derived.tagsByCategory, filters.category],
  );
  const [active, setActive] = useState<Sticker | null>(null);
  const [open, setOpen] = useState(false);
  const onOpen = useCallback((s: Sticker) => {
    setActive(s);
    setOpen(true);
  }, []);

  useGlobalSearchShortcut();

  return (
    <div className="flex flex-col gap-4">
      <GalleryControls
        characterId={characterId}
        categories={categories}
        counts={derived.categoryCounts}
        filters={filters}
        hideTopLevel={hideTopLevel}
        topTags={topTags}
      />
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <StickerGrid stickers={filtered} onOpen={onOpen} />
      )}
      <StickerPreviewModal sticker={active} isOpen={open} onOpenChange={setOpen} />
    </div>
  );
}

function useScopedFilters(characterId: string, categories: readonly Category[]) {
  const scopeId = useFilterStore((s) => s.scopeId);
  const storeQuery = useFilterStore((s) => s.query);
  const storeCategory = useFilterStore((s) => s.category);
  const storeTags = useFilterStore((s) => s.tags);
  const setGalleryScope = useFilterStore((s) => s.setGalleryScope);
  const setQuery = useFilterStore((s) => s.setQuery);
  const setCategory = useFilterStore((s) => s.setCategory);
  const toggleTag = useFilterStore((s) => s.toggleTag);
  const clearTags = useFilterStore((s) => s.clearTags);
  const defaultCategory = useMemo(() => defaultCategoryId(categories), [categories]);
  const currentScope = scopeId === characterId;
  const query = currentScope ? storeQuery : "";
  const category = currentScope ? storeCategory : defaultCategory;
  const tags = currentScope ? storeTags : [];
  const deferredQuery = useDeferredValue(query);
  const deferredCategory = useDeferredValue(category);
  const deferredTags = useDeferredValue(tags);
  const isFiltering =
    deferredQuery !== query ||
    deferredCategory !== category ||
    deferredTags !== tags;

  useEffect(() => {
    setGalleryScope(characterId, defaultCategory);
  }, [characterId, defaultCategory, setGalleryScope]);

  return {
    category,
    clearTags,
    deferredCategory,
    deferredQuery,
    deferredTags,
    isFiltering,
    query,
    setCategory,
    setQuery,
    tags,
    toggleTag,
  };
}

type GalleryFilters = ReturnType<typeof useScopedFilters>;

function useFuseIndex(stickers: readonly Sticker[]) {
  const [fuse, setFuse] = useState<ReturnType<typeof createFuse> | null>(null);

  useEffect(() => {
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    idle(() => setFuse(createFuse(stickers)));
  }, [stickers]);

  return fuse;
}

function useFilteredStickers(
  stickers: readonly Sticker[],
  fuse: ReturnType<typeof createFuse> | null,
  filters: GalleryFilters,
  descendantMap: ReadonlyMap<string, ReadonlySet<string>>,
) {
  const selectedCategoryIds = useMemo(() => {
    if (!filters.deferredCategory) return null;
    return descendantMap.get(filters.deferredCategory) ?? new Set([filters.deferredCategory]);
  }, [filters.deferredCategory, descendantMap]);

  return useMemo(
    () =>
      filterStickers(stickers, fuse, {
        query: filters.deferredQuery,
        categoryIds: selectedCategoryIds,
        tags: filters.deferredTags,
      }),
    [stickers, fuse, filters.deferredQuery, selectedCategoryIds, filters.deferredTags],
  );
}

function useGlobalSearchShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          "input[type='search']",
        );
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function GalleryControls({
  characterId,
  categories,
  counts,
  filters,
  hideTopLevel,
  topTags,
}: {
  characterId: string;
  categories: Category[];
  counts: Record<string, number>;
  filters: GalleryFilters;
  hideTopLevel: boolean;
  topTags: CategoryTagCount[];
}) {
  return (
    <>
      <SearchBar
        key={characterId}
        query={filters.query}
        onQueryChange={filters.setQuery}
      />
      <CategoryTabs
        categories={categories}
        counts={counts}
        selectedCategory={filters.category}
        onCategoryChange={filters.setCategory}
        hideTopLevel={hideTopLevel}
      />
      <TagFilter
        tags={topTags}
        selected={filters.tags}
        onToggle={filters.toggleTag}
        onClear={filters.clearTags}
      />
    </>
  );
}

function createGalleryDerivedData(
  categories: readonly Category[],
  stickers: readonly Sticker[],
) {
  const descendantMap = createCategoryDescendantMap(categories);
  return {
    descendantMap,
    categoryCounts: countStickersByCategoryTree(categories, stickers, descendantMap),
    tagsByCategory: countTagsByCategoryTree(categories, stickers, descendantMap),
  };
}

function getTopTags(
  tagsByCategory: ReadonlyMap<string | null, CategoryTagCount[]>,
  category: string | null,
) {
  return tagsByCategory.get(category) ?? tagsByCategory.get(null) ?? [];
}

function EmptyState() {
  return (
    <div className="motion-panel flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-16 text-center text-zinc-500 dark:border-zinc-700">
      <div className="text-4xl">🐈‍⬛</div>
      <div className="text-sm">没找到匹配的表情包，换个关键词试试？</div>
    </div>
  );
}
