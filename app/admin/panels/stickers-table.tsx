"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Button, Checkbox, Chip } from "@heroui/react";
import type { Category } from "@/lib/types";
import { bulkUpdateStickers } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { AdminStickerRow, StickerSort } from "@/lib/queries/admin-stickers";
import { StickersBulkModal } from "./stickers-bulk-modal";
import { StickerEditModal } from "./sticker-edit-modal";
import { PageSizeSelect, SortableHeader, StickerMobileCard, StatusChip } from "./stickers-table-parts";

interface Props { items: readonly AdminStickerRow[]; categories: readonly Category[]; page: number; pageCount: number; pageSize: number; sort: StickerSort; total: number; }

export function StickersTable({ items, categories, page, pageCount, pageSize, sort, total }: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
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
    const params = new URLSearchParams(searchParams);
    params.set("tab", "stickers");
    params.set("page", String(next));
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const setPageSize = (nextSize: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "stickers");
    params.delete("page");
    if (nextSize === "20") params.delete("pageSize");
    else params.set("pageSize", nextSize);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const setSort = (nextSort: StickerSort) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "stickers");
    params.delete("page");
    if (nextSort === "grouped") params.delete("sort");
    else params.set("sort", nextSort);
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
              item={item}
              selected={selectedSet.has(item.id)}
              onToggle={toggleOne}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      <div className="desktop-table-wrap overflow-x-auto rounded-lg border border-default-200 bg-content1 shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-default-200 text-xs text-default-500">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  aria-label="全选"
                  isSelected={items.length > 0 && items.every((i) => selectedSet.has(i.id))}
                  onChange={toggleAll}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox>
              </th>
              <th className="p-3">预览</th>
              <SortableHeader label="名字" sort={sort} asc="name" desc="name-desc" onSort={setSort} />
              <SortableHeader label="分类" sort={sort} asc="category" desc="category-desc" onSort={setSort} />
              <th className="p-3">标签</th>
              <SortableHeader label="状态" sort={sort} asc="status" desc="status-desc" onSort={setSort} />
              <SortableHeader label="投稿者" sort={sort} asc="submitter" desc="submitter-desc" onSort={setSort} />
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-default-400">
                  没有匹配的贴纸。调整筛选或翻页试试。
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-default-100 hover:bg-default-50 last:border-0 dark:hover:bg-default-100/5 ${selectedSet.has(item.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="p-3">
                    <Checkbox
                      aria-label={`选择 ${item.name}`}
                      isSelected={selectedSet.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox>
                  </td>
                  <td className="p-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-default-100">
                      <Image
                        src={item.src}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                        unoptimized={item.ext === "gif"}
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="font-mono text-xs text-default-400">
                      {item.id} · {item.width}×{item.height} · {item.ext}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-default-500">{item.categoryId}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.length === 0 ? (
                        <span className="text-xs text-default-400">—</span>
                      ) : (
                        item.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="soft">
                            <Chip.Label>#{tag}</Chip.Label>
                          </Chip>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusChip status={item.status} />
                  </td>
                  <td className="p-3 text-xs text-default-500">
                    <div>
                      {item.submitterLogin
                        ? `@${item.submitterLogin}`
                        : (item.submitterName ?? "—")}
                    </div>
                    <div className="text-[10px] text-default-400">
                      {new Date(item.submittedAt).toLocaleDateString("zh-CN")}
                    </div>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" onPress={() => setEditing(item)} className="motion-press">
                      编辑
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
