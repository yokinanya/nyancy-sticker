"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { bulkUpdateStickers } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { AdminStickerRow, StickerSort } from "@/lib/queries/admin-stickers";
import type { StickerFilterUpdates, StickerTableFilters } from "./stickers-table-query";
import { createCategoryDisplayMap, EMPTY_STICKER_FILTERS } from "./stickers-table-query";
import type { StickersTableProps } from "./stickers-table-types";

export function useStickersTable(props: StickersTableProps) {
  const router = useRouter();
  const navigation = useTableNavigation();
  const selection = useTableSelection(props.items);
  const bulkForm = useBulkForm(props);
  const bulkRunner = useBulkRunner({ bulkForm, router, selection });
  const [editing, setEditing] = useState<AdminStickerRow | null>(null);
  const categoryDisplayMap = useMemo(
    () => createCategoryDisplayMap(props.categories),
    [props.categories],
  );
  return {
    bulk: { ...bulkForm, ...bulkRunner },
    categoryDisplayMap,
    editing,
    navigation,
    selection,
    setEditing,
    onEditSaved: () => { setEditing(null); router.refresh(); },
  };
}

export type StickersTableController = ReturnType<typeof useStickersTable>;

function useTableSelection(items: readonly AdminStickerRow[]) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedItems = useMemo(
    () => selected.flatMap((id) => items.find((item) => item.id === id) ?? []),
    [items, selected],
  );
  const deleteDisabledReason = bulkDeleteDisabledReason(selected.length, selectedItems);
  const toggleAll = useCallback(() => {
    const ids = items.map((item) => item.id);
    setSelected(ids.every((id) => selectedSet.has(id)) ? [] : ids);
  }, [items, selectedSet]);
  const toggleOne = useCallback((id: string) => {
    setSelected((current) => current.includes(id)
      ? current.filter((itemId) => itemId !== id)
      : [...current, id]);
  }, []);
  return { deleteDisabledReason, selected, selectedSet, setSelected, toggleAll, toggleOne };
}

function useTableNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const push = useCallback((update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    update(params);
    startTransition(() => router.push(`/admin/stickers?${params.toString()}`));
  }, [router, searchParams]);
  const goPage = useCallback((page: number) => push((params) => params.set("page", String(page))), [push]);
  const setPageSize = useCallback((size: string) => push((params) => {
    params.delete("page");
    if (size === "20") params.delete("pageSize");
    else params.set("pageSize", size);
  }), [push]);
  const setSort = useCallback((sort: StickerSort) => push((params) => {
    params.delete("page");
    if (sort === "grouped") params.delete("sort");
    else params.set("sort", sort);
  }), [push]);
  const applyFilter = useCallback((updates: StickerFilterUpdates) => push((params) => {
    params.delete("page");
    setFilterParams(params, updates);
  }), [push]);
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  return { applyFilter, filters, goPage, setPageSize, setSort };
}

function useBulkForm({ categories, characters }: StickersTableProps) {
  const [character, setCharacter] = useState(characters[0]?.id ?? "");
  const subCategories = useMemo(
    () => categories.filter((category) => category.characterId === character),
    [categories, character],
  );
  const [category, setCategory] = useState(subCategories[0]?.id ?? "");
  const [tags, setTags] = useState<readonly string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagMode, setTagMode] = useState<"add-tags" | "remove-tags">("add-tags");
  const [isOpen, setOpen] = useState(false);
  const addTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    setTags((current) => current.includes(tag) ? current : [...current, tag]);
    setTagDraft("");
  };
  const changeCharacter = (value: string) => {
    setCharacter(value);
    setCategory(categories.find((item) => item.characterId === value)?.id ?? "");
  };
  const removeTags = (keys: Set<React.Key>) => {
    const removed = new Set([...keys].map(String));
    setTags((current) => current.filter((tag) => !removed.has(tag)));
  };
  return { addTag, category, changeCharacter, character, isOpen, removeTags, setCategory, setOpen, setTagDraft, setTagMode, subCategories, tagDraft, tagMode, tags };
}

function useBulkRunner(options: {
  readonly bulkForm: ReturnType<typeof useBulkForm>;
  readonly router: ReturnType<typeof useRouter>;
  readonly selection: ReturnType<typeof useTableSelection>;
}) {
  const feedback = useFeedback();
  const [isPending, startTransition] = useTransition();
  const run = (operation: string) => {
    const validationError = validateBulkOperation(operation, options);
    if (validationError) {
      feedback.error(validationError);
      return;
    }
    const formData = createBulkFormData(operation, options);
    startTransition(async () => {
      try {
        await bulkUpdateStickers(formData);
        feedback.success(`已批量执行：${operation}`);
        options.selection.setSelected([]);
        options.bulkForm.setOpen(false);
        options.router.refresh();
      } catch (error) {
        feedback.error(error instanceof Error ? error.message : "操作失败。");
      }
    });
  };
  return { isPending, run };
}

function validateBulkOperation(operation: string, options: Parameters<typeof useBulkRunner>[0]) {
  if (options.selection.selected.length === 0) return "请先选择至少一张贴纸。";
  if (operation === "category" && !options.bulkForm.category) return "请选择子分类。";
  if (operation === "delete") return options.selection.deleteDisabledReason;
  return null;
}

function createBulkFormData(operation: string, options: Parameters<typeof useBulkRunner>[0]) {
  const formData = new FormData();
  formData.set("operation", operation);
  formData.set("category", options.bulkForm.category);
  formData.set("tags", options.bulkForm.tags.join(","));
  options.selection.selected.forEach((id) => formData.append("ids", id));
  return formData;
}

function readFilters(searchParams: { get(key: string): string | null }): StickerTableFilters {
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

function bulkDeleteDisabledReason(count: number, items: readonly AdminStickerRow[]): string | null {
  if (count === 0) return "请先选择至少一张贴纸。";
  if (items.length !== count) return "当前选择包含未加载的贴纸，请在当前页重新选择。";
  return items.some((item) => item.status !== "rejected") ? "只能删除已拒绝的贴纸。" : null;
}
