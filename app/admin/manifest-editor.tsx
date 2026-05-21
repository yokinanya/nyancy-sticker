"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Category, Manifest, Sticker } from "@/lib/types";
import { bulkUpdateStickers } from "./actions";
import { CategorySelect } from "./category-select";
import { StickerTable } from "./sticker-table";
import { TaxonomyPanel } from "./taxonomy-panel";
import { UploadPanel } from "./upload-panel";

interface Props {
  manifest: Manifest;
}

export function ManifestEditor({ manifest }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(manifest.categories[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState("选择表情后可批量操作。");
  const [pending, startTransition] = useTransition();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const stickers = useMemo(() => filterStickers(manifest.stickers, query), [manifest, query]);

  const runAction = (action: () => Promise<void>, done: string) => {
    startTransition(async () => {
      try {
        await action();
        setMessage(done);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "操作失败。");
      }
    });
  };

  const runBulk = (operation: string) => {
    if (operation === "delete" && !window.confirm("确定删除选中的表情记录？")) return;
    const formData = buildBulkForm(operation, selectedIds, category, tags);
    runAction(async () => bulkUpdateStickers(formData), `已执行：${operation}`);
    setSelectedIds([]);
  };

  const toggleAll = () => {
    const ids = stickers.map((sticker) => sticker.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelectedIds((current) =>
      allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    );
  };

  const toggleOne = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  };

  return (
    <div className="flex flex-col gap-5">
      <Header manifest={manifest} />
      <UploadPanel categories={manifest.categories} onRun={runAction} pending={pending} />
      <TaxonomyPanel
        categories={manifest.categories}
        stickers={manifest.stickers}
        pending={pending}
        onRun={runAction}
      />
      <BulkToolbar
        categories={manifest.categories}
        selectedCount={selectedIds.length}
        category={category}
        tags={tags}
        query={query}
        pending={pending}
        message={message}
        onCategoryChange={setCategory}
        onTagsChange={setTags}
        onQueryChange={setQuery}
        onRun={runBulk}
        onToggleAll={toggleAll}
      />
      <StickerTable
        categories={manifest.categories}
        selected={selected}
        stickers={stickers}
        onRun={runAction}
        onToggle={toggleOne}
      />
    </div>
  );
}

function Header({ manifest }: { manifest: Manifest }) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">本地数据管理</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {manifest.categories.length} 个分类，{manifest.stickers.length} 张表情
      </p>
    </div>
  );
}

function BulkToolbar(props: {
  categories: readonly Category[];
  selectedCount: number;
  category: string;
  tags: string;
  query: string;
  pending: boolean;
  message: string;
  onCategoryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onRun: (operation: string) => void;
  onToggleAll: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        <input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="搜索 id / 名称 / 标签" className="admin-input" />
        <button type="button" className="admin-button" onClick={props.onToggleAll}>全选当前列表</button>
        <CategorySelect categories={props.categories} value={props.category} onChange={props.onCategoryChange} />
        <button type="button" className="admin-button" onClick={() => props.onRun("category")}>批量改分类</button>
        <input value={props.tags} onChange={(event) => props.onTagsChange(event.target.value)} placeholder="标签，逗号分隔" className="admin-input" />
        <button type="button" className="admin-button" onClick={() => props.onRun("add-tags")}>加标签</button>
        <button type="button" className="admin-button" onClick={() => props.onRun("remove-tags")}>删标签</button>
        <button type="button" className="admin-danger" onClick={() => props.onRun("delete")}>删除</button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        已选 {props.selectedCount} 张 · {props.pending ? "处理中" : props.message}
      </p>
    </div>
  );
}

function buildBulkForm(operation: string, ids: readonly string[], category: string, tags: string) {
  const formData = new FormData();
  formData.set("operation", operation);
  formData.set("category", category);
  formData.set("tags", tags);
  ids.forEach((id) => formData.append("ids", id));
  return formData;
}

function filterStickers(stickers: readonly Sticker[], query: string): readonly Sticker[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return stickers;
  return stickers.filter((sticker) =>
    [sticker.id, sticker.name, sticker.category, ...sticker.tags].join(" ").toLowerCase().includes(keyword),
  );
}
