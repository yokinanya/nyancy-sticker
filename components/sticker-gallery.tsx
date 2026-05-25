"use client";

import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BatchDownloadBar,
  SelectionModeToggle,
  useStickerSelection,
  type StickerSelection,
} from "./batch-download-controls";
import { SearchBar } from "./search-bar";
import { CategoryTabs } from "./category-tabs";
import { TagFilter } from "./tag-filter";
import { StickerGrid } from "./sticker-grid";
import { useFilterStore } from "@/lib/store";
import {
  countTagsByCategoryTree,
  countStickersByCategoryTree,
  createCategoryDescendantMap,
  defaultCategoryId,
  type CategoryTagCount,
} from "@/lib/categories";
import type { Category, Manifest, Sticker } from "@/lib/types";

const StickerPreviewModal = dynamic(
  () => import("./sticker-preview-modal").then((module) => module.StickerPreviewModal),
  { ssr: false },
);

interface Props {
  manifest: Manifest;
  characterId?: string;
  characterName?: string;
  hideTopLevel?: boolean;
}

export function StickerGallery({
  manifest,
  characterId = "all",
  characterName = "stickers",
  hideTopLevel = false,
}: Props) {
  const { categories, stickers } = manifest;
  const filters = useScopedFilters(characterId, categories);
  const fuse = useFuseIndex(stickers, filters.deferredQuery);
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
  const selection = useStickerSelection(filtered, characterName);
  const { isSelectionMode, toggle } = selection;
  const onOpen = useCallback((s: Sticker) => {
    if (isSelectionMode) {
      toggle(s.id);
      return;
    }
    setActive(s);
    setOpen(true);
  }, [isSelectionMode, toggle]);

  useGlobalSearchShortcut();

  return (
    <div className={selection.isSelectionMode ? "flex flex-col gap-4 pb-24" : "flex flex-col gap-4"}>
      <GalleryControls
        characterId={characterId}
        categories={categories}
        counts={derived.categoryCounts}
        filters={filters}
        hideTopLevel={hideTopLevel}
        selection={selection}
        topTags={topTags}
      />
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <StickerGrid
          stickers={filtered}
          onOpen={onOpen}
          isSelectionMode={selection.isSelectionMode}
          selectedIds={selection.selectedIds}
        />
      )}
      <BatchDownloadBar selection={selection} />
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

type FuseIndex = {
  search: (query: string) => { item: Sticker }[];
};

function useFuseIndex(stickers: readonly Sticker[], query: string) {
  const [fuse, setFuse] = useState<FuseIndex | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    idle(() => {
      void import("@/lib/search").then(({ createFuse }) => {
        if (!cancelled) setFuse(createFuse(stickers));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [stickers, query]);

  return fuse;
}

function useFilteredStickers(
  stickers: readonly Sticker[],
  fuse: FuseIndex | null,
  filters: GalleryFilters,
  descendantMap: ReadonlyMap<string, ReadonlySet<string>>,
) {
  const selectedCategoryIds = useMemo(() => {
    if (!filters.deferredCategory) return null;
    return descendantMap.get(filters.deferredCategory) ?? new Set([filters.deferredCategory]);
  }, [filters.deferredCategory, descendantMap]);

  return useMemo(
    () => filterStickers(stickers, fuse, filters.deferredQuery, selectedCategoryIds, filters.deferredTags),
    [stickers, fuse, filters.deferredQuery, selectedCategoryIds, filters.deferredTags],
  );
}

function filterStickers(
  stickers: readonly Sticker[],
  fuse: FuseIndex | null,
  query: string,
  categoryIds: ReadonlySet<string> | null,
  tags: readonly string[],
) {
  const text = query.trim();
  const pool = text && fuse ? fuse.search(text).map((result) => result.item) : stickers;
  return pool.filter((sticker) => matchesFilters(sticker, categoryIds, tags));
}

function matchesFilters(
  sticker: Sticker,
  categoryIds: ReadonlySet<string> | null,
  tags: readonly string[],
) {
  if (categoryIds && !categoryIds.has(sticker.category)) return false;
  if (tags.length === 0) return true;
  return tags.every((tag) => sticker.tags.includes(tag));
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
  selection,
  topTags,
}: {
  characterId: string;
  categories: Category[];
  counts: Record<string, number>;
  filters: GalleryFilters;
  hideTopLevel: boolean;
  selection: StickerSelection;
  topTags: CategoryTagCount[];
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <SelectionModeToggle selection={selection} />
        <div className="min-w-0 flex-1">
          <SearchBar key={characterId} query={filters.query} onQueryChange={filters.setQuery} />
        </div>
      </div>
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
    categoryCounts: countStickersByCategoryTree(categories, stickers),
    tagsByCategory: countTagsByCategoryTree(categories, stickers),
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
    <div className="motion-panel flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-surface/70 px-4 py-14 text-center text-muted">
      <div className="text-sm">没找到匹配的表情包，换个关键词试试？</div>
    </div>
  );
}
