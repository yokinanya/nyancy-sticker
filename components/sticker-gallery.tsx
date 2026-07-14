"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
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
import { useGalleryFilters, type GalleryFilters } from "./use-gallery-filters";
import { useFilteredStickers, useStickerSearch } from "./use-sticker-search";
import { ListBox, Select } from "@/components/ui/heroui-compat";
import type { GallerySortMode } from "@/lib/sticker-order";
import {
  countTagsByCategoryTree,
  countStickersByCategoryTree,
  createCategoryDescendantMap,
  type CategoryTagCount,
} from "@/lib/categories";
import type { Category, Manifest, Sticker } from "@/lib/types";
import { selectedOptionLabel } from "@/lib/option-label";

const SORT_MODE_OPTIONS = [
  { value: "default", label: "默认排序" },
  { value: "newest", label: "最新上传" },
  { value: "oldest", label: "最早上传" },
  { value: "name", label: "按名称" },
] as const;

const StickerPreviewModal = dynamic(
  () => import("./sticker-preview-modal").then((module) => module.StickerPreviewModal),
  { ssr: false },
);

interface Props {
  readonly manifest: Manifest;
  readonly characterId?: string;
  readonly characterName?: string;
  readonly showAllCategoryTab?: boolean;
}

export function StickerGallery({
  manifest,
  characterId = "all",
  characterName = "stickers",
  showAllCategoryTab = false,
}: Props) {
  const view = useGalleryView({ manifest, characterId, characterName, showAllCategoryTab });
  return <GalleryView {...view} characterId={characterId} categories={manifest.categories} showAllCategoryTab={showAllCategoryTab} />;
}

function useGalleryView({ manifest, characterId = "all", characterName = "stickers", showAllCategoryTab = false }: Props) {
  const { categories, stickers } = manifest;
  const filters = useGalleryFilters({ characterId, categories, showAllCategoryTab });
  const index = useStickerSearch({ stickers, query: filters.deferredQuery });
  const derived = useMemo(
    () => createGalleryDerivedData(categories, stickers),
    [categories, stickers],
  );
  const topTags = useMemo(
    () => getTopTags(derived.tagsByCategory, filters.category),
    [derived.tagsByCategory, filters.category],
  );
  const [active, setActive] = useState<Sticker | null>(null);
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<GallerySortMode>("default");
  const filtered = useFilteredStickers({
    stickers,
    index,
    filters,
    descendantMap: derived.descendantMap,
    sortMode,
  });
  const selection = useStickerSelection(filtered, characterName);
  const onOpen = useStickerOpen(selection, setActive, setOpen);
  return { active, derived, filtered, filters, onOpen, open, selection, setOpen, setSortMode, sortMode, topTags };
}

function GalleryView(options: ReturnType<typeof useGalleryView> & Pick<Props, "characterId" | "showAllCategoryTab"> & { readonly categories: readonly Category[] }) {
  return (
    <div className={options.selection.isSelectionMode ? "flex flex-col gap-4 pb-24" : "flex flex-col gap-4"}>
      <GalleryControls
        characterId={options.characterId ?? "all"} categories={options.categories}
        counts={options.derived.categoryCounts} filters={options.filters}
        showAllCategoryTab={options.showAllCategoryTab ?? false} selection={options.selection}
        sortMode={options.sortMode} onSortModeChange={options.setSortMode} topTags={options.topTags}
      />
      {options.filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <StickerGrid stickers={options.filtered} onOpen={options.onOpen} isSelectionMode={options.selection.isSelectionMode} selectedIds={options.selection.selectedIds} />
      )}
      <BatchDownloadBar selection={options.selection} />
      <StickerPreviewModal sticker={options.active} isOpen={options.open} onOpenChange={options.setOpen} />
    </div>
  );
}

function useStickerOpen(
  selection: StickerSelection,
  setActive: (sticker: Sticker) => void,
  setOpen: (open: boolean) => void,
) {
  const { isSelectionMode, toggle } = selection;
  return useCallback((sticker: Sticker) => {
    if (isSelectionMode) {
      toggle(sticker.id);
      return;
    }
    setActive(sticker);
    setOpen(true);
  }, [isSelectionMode, setActive, setOpen, toggle]);
}

function GalleryControls({
  characterId,
  categories,
  counts,
  filters,
  onSortModeChange,
  showAllCategoryTab,
  selection,
  sortMode,
  topTags,
}: GalleryControlsProps) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_10rem] sm:items-center">
        <SelectionModeToggle selection={selection} />
        <div className="min-w-0 flex-1">
          <SearchBar key={characterId} query={filters.query} onQueryChange={filters.setQuery} />
        </div>
        <SortModeSelect value={sortMode} onChange={onSortModeChange} />
      </div>
      <CategoryTabs
        categories={categories}
        counts={counts}
        selectedCategory={filters.category}
        onCategoryChange={filters.setCategory}
        showAllCategoryTab={showAllCategoryTab}
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

function SortModeSelect({
  onChange,
  value,
}: {
  readonly onChange: (sortMode: GallerySortMode) => void;
  readonly value: GallerySortMode;
}) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key) as GallerySortMode)}>
      <Select.Trigger aria-label="排序方式" className="field-trigger min-h-10 w-full bg-content1 px-3">
        <Select.Value>{selectedOptionLabel(SORT_MODE_OPTIONS, value)}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface min-w-40">
        <ListBox>
          {SORT_MODE_OPTIONS.map((option) => (
            <ListBox.Item key={option.value} id={option.value} className="listbox-option">
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
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

interface GalleryControlsProps {
  readonly characterId: string;
  readonly categories: readonly Category[];
  readonly counts: Record<string, number>;
  readonly filters: GalleryFilters;
  readonly onSortModeChange: (sortMode: GallerySortMode) => void;
  readonly showAllCategoryTab: boolean;
  readonly selection: StickerSelection;
  readonly sortMode: GallerySortMode;
  readonly topTags: CategoryTagCount[];
}
