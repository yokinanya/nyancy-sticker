"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/heroui-compat";
import type { Category } from "@/lib/types";
import { bulkUpdateStickers } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { AdminStickerRow, StickerSort } from "@/lib/queries/admin-stickers";
import { StickersDesktopTable } from "./stickers-desktop-table";
import { StickersBulkModal } from "./stickers-bulk-modal";
import { StickerEditModal } from "./sticker-edit-modal";
import { PageSizeSelect, StickerMobileCard } from "./stickers-table-parts";
import {
  categoryDisplayName,
  createCategoryDisplayMap,
  EMPTY_STICKER_FILTERS,
  type StickerFilterUpdates,
  type StickerTableFilters,
} from "./stickers-table-query";

interface Props { items: readonly AdminStickerRow[]; categories: readonly Category[]; page: number; pageCount: number; pageSize: number; sort: StickerSort; total: number; }

export function StickersTable({ items, categories, page, pageCount, pageSize, sort, total }: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const categoryDisplayMap = useMemo(() => createCategoryDisplayMap(categories), [categories]);
  const [editing, setEditing] = useState<AdminStickerRow | null>(null);
  const topLevels = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const [bulkCharacter, setBulkCharacter] = useState(topLevels[0]?.id ?? "");
  const bulkSubCategories = useMemo(
    () => categories.filter((category) => category.parentId === bulkCharacter),
    [categories, bulkCharacter],
  );
  const [bulkCategory, setBulkCategory] = useState(bulkSubCategories[0]?.id ?? "");
  const [bulkTags, setBulkTags] = useState<readonly string[]>([]);
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkTagMode, setBulkTagMode] = useState<"add-tags" | "remove-tags">("add-tags");
  const [bulkOpen, setBulkOpen] = useState(false);
  const toggleAll = () => {
    const ids = items.map((i) => i.id);
    const allSelected = ids.every((id) => selected.includes(id));
    setSelected(allSelected ? [] : ids);
  };
  const toggleOne = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);
  const openEdit = useCallback((item: AdminStickerRow) => setEditing(item), []);

  const runBulk = (operation: string) => {
    if (selected.length === 0) return;
    if (operation === "category" && !bulkCategory) {
      feedback.error("请选择子分类。");
      return;
    }
    if (operation === "delete" && !window.confirm(`确认删除 ${selected.length} 张贴纸？`)) return;
    const fd = new FormData();
    fd.set("operation", operation);
    fd.set("category", bulkCategory);
    fd.set("tags", bulkTags.join(","));
    selected.forEach((id) => fd.append("ids", id));
    startTransition(async () => {
      try {
        await bulkUpdateStickers(fd);
        feedback.success(`已批量执行：${operation}`);
        setSelected([]);
        setBulkOpen(false);
        router.refresh();
      } catch (e) {
        feedback.error(e instanceof Error ? e.message : "操作失败。");
      }
    });
  };

  const goPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "stickers");
    params.set("page", String(next));
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const setPageSize = (nextSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "stickers");
    params.delete("page");
    if (nextSize === "20") params.delete("pageSize");
    else params.set("pageSize", nextSize);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const setSort = (nextSort: StickerSort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "stickers");
    params.delete("page");
    if (nextSort === "grouped") params.delete("sort");
    else params.set("sort", nextSort);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const applyFilter = (updates: StickerFilterUpdates) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "stickers");
    params.delete("page");
    setFilterParams(params, updates);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const addBulkTag = () => {
    const tag = bulkTagDraft.trim();
    if (!tag) return;
    setBulkTags((tags) => (tags.includes(tag) ? tags : [...tags, tag]));
    setBulkTagDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="admin-toolbar p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            className="motion-press"
            isDisabled={selected.length === 0}
            onPress={() => setBulkOpen(true)}
          >
            批量操作（{selected.length}）
          </Button>
          <p className="text-sm text-default-500">已选 {selected.length} 张贴纸</p>
        </div>
      </div>

      <div className="mobile-card-list">
        {items.length === 0 ? (
          <p className="admin-panel p-6 text-center text-sm text-default-400">
            没有匹配的贴纸。调整筛选或翻页试试。
          </p>
        ) : (
          items.map((item) => (
            <StickerMobileCard
              key={item.id}
              categoryDisplay={categoryDisplayName(categoryDisplayMap, item.categoryId)}
              item={item}
              selected={selectedSet.has(item.id)}
              onToggle={toggleOne}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      <StickersDesktopTable
        categories={categories}
        filters={filters}
        items={items}
        onApplyFilter={applyFilter}
        onEdit={openEdit}
        onSort={setSort}
        onToggle={toggleOne}
        onToggleAll={toggleAll}
        selectedSet={selectedSet}
        sort={sort}
      />

      <div className="admin-toolbar flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-default-500">
        <span>
          第 {page} / {pageCount} 页 · 共 {total} 条
        </span>
        <div className="flex items-center gap-2">
          <PageSizeSelect value={String(pageSize)} onChange={setPageSize} />
          <Button size="sm" variant="ghost" isDisabled={page <= 1} onPress={() => goPage(page - 1)} className="motion-press">
            上一页
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page >= pageCount}
            onPress={() => goPage(page + 1)}
            className="motion-press"
          >
            下一页
          </Button>
        </div>
      </div>

      {editing ? (
        <StickerEditModal
          sticker={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
      <StickersBulkModal
        topLevels={topLevels}
        subCategories={bulkSubCategories}
        character={bulkCharacter}
        category={bulkCategory}
        isOpen={bulkOpen}
        isPending={pending}
        tags={bulkTags}
        tagDraft={bulkTagDraft}
        tagMode={bulkTagMode}
        onAddTag={addBulkTag}
        onChangeCategory={setBulkCategory}
        onChangeCharacter={(value) => {
          setBulkCharacter(value);
          setBulkCategory(categories.find((category) => category.parentId === value)?.id ?? "");
        }}
        onChangeTagMode={setBulkTagMode}
        onChangeTagDraft={setBulkTagDraft}
        onClose={() => setBulkOpen(false)}
        onRemoveTags={(keys) => {
          const removed = new Set([...keys].map(String));
          setBulkTags((tags) => tags.filter((tag) => !removed.has(tag)));
        }}
        onRun={runBulk}
      />
    </div>
  );
}

function readFilters(searchParams: { get: (key: string) => string | null }): StickerTableFilters {
  return {
    ...EMPTY_STICKER_FILTERS,
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    character: searchParams.get("character") ?? "",
    category: searchParams.get("category") ?? "",
    submitter: searchParams.get("submitter") ?? "",
  };
}

function setFilterParams(params: URLSearchParams, updates: StickerFilterUpdates) {
  Object.entries(updates).forEach(([key, value]) => {
    const text = value?.trim() ?? "";
    if (text) params.set(key, text);
    else params.delete(key);
  });
  if (updates.character === "") params.delete("category");
}
