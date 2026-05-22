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
  countStickersByCategoryTree,
  createCategoryDescendantMap,
} from "@/lib/categories";
import type { Manifest, Sticker } from "@/lib/types";

interface Props {
  manifest: Manifest;
  hideTopLevel?: boolean;
}

export function StickerGallery({ manifest, hideTopLevel = false }: Props) {
  const { categories, stickers } = manifest;
  const query = useFilterStore((s) => s.query);
  const category = useFilterStore((s) => s.category);
  const tags = useFilterStore((s) => s.tags);
  const deferredQuery = useDeferredValue(query);
  const deferredCategory = useDeferredValue(category);
  const deferredTags = useDeferredValue(tags);
  const isFiltering =
    deferredQuery !== query ||
    deferredCategory !== category ||
    deferredTags !== tags;

  // Fuse 索引在 idle 时构建
  const [fuse, setFuse] = useState<ReturnType<typeof createFuse> | null>(null);
  useEffect(() => {
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    idle(() => setFuse(createFuse(stickers)));
  }, [stickers]);

  const descendantMap = useMemo(
    () => createCategoryDescendantMap(categories),
    [categories],
  );

  const selectedCategoryIds = useMemo(() => {
    if (!deferredCategory) return null;
    return descendantMap.get(deferredCategory) ?? new Set([deferredCategory]);
  }, [deferredCategory, descendantMap]);

  const filtered = useMemo(
    () =>
      filterStickers(stickers, fuse, {
        query: deferredQuery,
        categoryIds: selectedCategoryIds,
        tags: deferredTags,
      }),
    [stickers, fuse, deferredQuery, selectedCategoryIds, deferredTags],
  );

  const categoryCounts = useMemo(() => {
    return countStickersByCategoryTree(categories, stickers);
  }, [categories, stickers]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    const tagCategoryIds = category
      ? descendantMap.get(category) ?? new Set([category])
      : null;
    const pool = tagCategoryIds
      ? stickers.filter((s) => tagCategoryIds.has(s.category))
      : stickers;
    for (const s of pool) {
      for (const t of s.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [stickers, category, descendantMap]);

  const [active, setActive] = useState<Sticker | null>(null);
  const [open, setOpen] = useState(false);
  const onOpen = useCallback((s: Sticker) => {
    setActive(s);
    setOpen(true);
  }, []);

  // 全局快捷键：/ 聚焦搜索
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

  return (
    <div className="flex flex-col gap-4">
      <SearchBar />
      <CategoryTabs
        categories={categories}
        counts={categoryCounts}
        hideTopLevel={hideTopLevel}
      />
      <TagFilter tags={topTags} />
      <div className="motion-panel rounded-md border border-black/5 bg-white/70 px-3 py-2 text-xs text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950/60">
        共 {filtered.length} 张 {query && `· 搜索「${query}」`}
        {tags.length > 0 && ` · 标签 ${tags.map((t) => `#${t}`).join(" ")}`}
        {isFiltering && <span className="ml-2 text-accent">更新中...</span>}
      </div>
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <StickerGrid stickers={filtered} onOpen={onOpen} />
      )}
      <StickerPreviewModal sticker={active} isOpen={open} onOpenChange={setOpen} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="motion-panel flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-16 text-center text-zinc-500 dark:border-zinc-700">
      <div className="text-4xl">🐈‍⬛</div>
      <div className="text-sm">没找到匹配的表情包，换个关键词试试？</div>
    </div>
  );
}
