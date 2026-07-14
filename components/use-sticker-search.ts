"use client";

import { useEffect, useMemo, useState } from "react";
import { orderGalleryStickers, type GallerySortMode } from "@/lib/sticker-order";
import type { Sticker } from "@/lib/types";
import type { GalleryFilters } from "./use-gallery-filters";

interface StickerSearchIndex {
  search(query: string): readonly { item: Sticker }[];
}

interface SearchState {
  readonly stickers: readonly Sticker[] | null;
  readonly index: StickerSearchIndex | null;
  readonly error: Error | null;
}

let searchModulePromise: Promise<typeof import("@/lib/search")> | null = null;

export function useStickerSearch(options: {
  readonly stickers: readonly Sticker[];
  readonly query: string;
}): StickerSearchIndex | null {
  const [state, setState] = useState<SearchState>({
    stickers: null,
    index: null,
    error: null,
  });
  const enabled = options.query.trim().length > 0;

  useEffect(() => {
    if (!enabled) return;
    const isCurrent = state.stickers === options.stickers;
    if (isCurrent && (state.index || state.error)) return;
    return scheduleIndexBuild(options.stickers, setState);
  }, [enabled, options.stickers, state.error, state.index, state.stickers]);

  if (state.stickers === options.stickers && state.error) throw state.error;
  return state.stickers === options.stickers ? state.index : null;
}

export function useFilteredStickers(options: {
  readonly stickers: readonly Sticker[];
  readonly index: StickerSearchIndex | null;
  readonly filters: GalleryFilters;
  readonly descendantMap: ReadonlyMap<string, ReadonlySet<string>>;
  readonly sortMode: GallerySortMode;
}): readonly Sticker[] {
  const { descendantMap, filters, index, sortMode, stickers } = options;
  const categoryIds = useMemo(() => {
    const category = filters.deferredCategory;
    if (!category) return null;
    return descendantMap.get(category) ?? new Set([category]);
  }, [descendantMap, filters.deferredCategory]);

  return useMemo(
    () => filterStickers({
      category: filters.deferredCategory,
      categoryIds,
      index,
      query: filters.deferredQuery,
      sortMode,
      stickers,
      tags: filters.deferredTags,
    }),
    [categoryIds, filters.deferredCategory, filters.deferredQuery, filters.deferredTags, index, sortMode, stickers],
  );
}

function scheduleIndexBuild(
  stickers: readonly Sticker[],
  setState: (state: SearchState) => void,
): () => void {
  let cancelled = false;
  const run = async () => {
    try {
      searchModulePromise ??= import("@/lib/search");
      const { createFuse } = await searchModulePromise;
      if (!cancelled) setState({ stickers, index: createFuse(stickers), error: null });
    } catch (cause) {
      if (!cancelled) {
        setState({ stickers, index: null, error: searchError(cause) });
      }
    }
  };
  const cancelScheduled = scheduleIdle(() => void run());
  return () => {
    cancelled = true;
    cancelScheduled();
  };
}

function scheduleIdle(task: () => void): () => void {
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(task);
    return () => idleWindow.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 0);
  return () => window.clearTimeout(id);
}

function filterStickers(options: {
  readonly stickers: readonly Sticker[];
  readonly index: StickerSearchIndex | null;
  readonly category: string | null;
  readonly categoryIds: ReadonlySet<string> | null;
  readonly query: string;
  readonly sortMode: GallerySortMode;
  readonly tags: readonly string[];
}): Sticker[] {
  const text = options.query.trim();
  const pool = text && options.index
    ? options.index.search(text).map((result) => result.item)
    : options.stickers;
  const filtered = pool.filter((sticker) =>
    matchesFilters(sticker, options.categoryIds, options.tags),
  );
  return orderGalleryStickers(
    filtered,
    options.category,
    options.sortMode,
  );
}

function matchesFilters(
  sticker: Sticker,
  categoryIds: ReadonlySet<string> | null,
  tags: readonly string[],
): boolean {
  if (categoryIds && !categoryIds.has(sticker.category)) return false;
  return tags.length === 0 || tags.every((tag) => sticker.tags.includes(tag));
}

function searchError(cause: unknown): Error {
  if (cause instanceof Error) {
    return new Error(`搜索索引加载失败：${cause.message}`, { cause });
  }
  return new Error("搜索索引加载失败。", { cause });
}
