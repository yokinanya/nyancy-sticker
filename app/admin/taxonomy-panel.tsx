"use client";

import { useMemo, useState } from "react";
import type { Category, Sticker } from "@/lib/types";
import {
  addCategory,
  deleteCategory,
  deleteTag,
  renameTag,
  updateCategory,
} from "./actions";
import { CategorySelect } from "./category-select";
import { topLevelCategories } from "@/lib/categories";

interface Props {
  categories: readonly Category[];
  stickers: readonly Sticker[];
  pending: boolean;
  onRun: (action: () => Promise<void>, done: string) => void;
}

export function TaxonomyPanel({ categories, stickers, pending, onRun }: Props) {
  const tagCounts = useMemo(() => countTags(stickers), [stickers]);
  const categoryCounts = useMemo(() => countCategories(stickers), [stickers]);

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <CategoryManager
        categories={categories}
        counts={categoryCounts}
        pending={pending}
        onRun={onRun}
      />
      <TagManager tags={tagCounts} pending={pending} onRun={onRun} />
    </section>
  );
}

function CategoryManager(props: {
  categories: readonly Category[];
  counts: ReadonlyMap<string, number>;
  pending: boolean;
  onRun: (action: () => Promise<void>, done: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-3 text-sm font-semibold">分类管理</h2>
      <form className="mb-3 grid grid-cols-[minmax(8rem,1fr)_minmax(10rem,1fr)_minmax(11rem,12rem)_auto] gap-2" onSubmit={(event) => submit(event, props.onRun, addCategory, "已新增分类。")}>
        <input name="categoryId" placeholder="id（二级可填短 id）" className="admin-input" />
        <input name="categoryName" placeholder="名称" className="admin-input" />
        <ParentSelect categories={topLevelCategories(props.categories)} name="parentId" />
        <button className="admin-button" disabled={props.pending} type="submit">新增</button>
      </form>
      <div className="flex flex-col gap-2 overflow-x-auto">
        {props.categories.map((category) => (
          <CategoryRow key={category.id} category={category} count={props.counts.get(category.id) ?? 0} {...props} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow(props: {
  categories: readonly Category[];
  category: Category;
  count: number;
  pending: boolean;
  onRun: (action: () => Promise<void>, done: string) => void;
}) {
  return (
    <form className="grid min-w-[42rem] grid-cols-[8rem_minmax(10rem,1fr)_minmax(11rem,12rem)_auto_auto] items-center gap-2" onSubmit={(event) => submit(event, props.onRun, updateCategory, `已更新分类：${props.category.id}`)}>
      <input name="categoryId" type="hidden" value={props.category.id} />
      <span className="truncate text-xs text-zinc-500" title={props.category.id}>{props.category.id} · {props.count}</span>
      <input name="categoryName" defaultValue={props.category.name} className="admin-input" />
      <ParentSelect
        categories={topLevelCategories(props.categories).filter(
          (category) => category.id !== props.category.id,
        )}
        name="parentId"
        value={props.category.parentId ?? ""}
      />
      <button className="admin-button" disabled={props.pending} type="submit">保存</button>
      <button
        className="admin-danger"
        disabled={props.pending}
        type="button"
        onClick={() => {
          const form = new FormData();
          form.set("categoryId", props.category.id);
          props.onRun(async () => deleteCategory(form), `已删除分类：${props.category.id}`);
        }}
      >
        删除
      </button>
    </form>
  );
}

function ParentSelect(props: {
  categories: readonly Category[];
  name: string;
  value?: string;
}) {
  const [value, setValue] = useState(props.value ?? "");
  const selected = value || "__root";
  return (
    <div className="flex items-center gap-2">
      <input name={props.name} type="hidden" value={value} />
      <CategorySelect
        categories={[{ id: "__root", name: "一级分类" }, ...props.categories]}
        value={selected}
        onChange={(nextValue) => setValue(nextValue === "__root" ? "" : nextValue)}
      />
    </div>
  );
}

function TagManager(props: {
  tags: readonly { tag: string; count: number }[];
  pending: boolean;
  onRun: (action: () => Promise<void>, done: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-3 text-sm font-semibold">标签管理</h2>
      {props.tags.length === 0 ? (
        <p className="text-xs text-zinc-500">还没有标签。</p>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-auto">
          {props.tags.map((item) => <TagRow key={item.tag} item={item} {...props} />)}
        </div>
      )}
    </div>
  );
}

function TagRow(props: {
  item: { tag: string; count: number };
  pending: boolean;
  onRun: (action: () => Promise<void>, done: string) => void;
}) {
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => submit(event, props.onRun, renameTag, `已重命名标签：${props.item.tag}`)}>
      <input name="tagFrom" type="hidden" value={props.item.tag} />
      <span className="w-28 text-xs text-zinc-500">#{props.item.tag} · {props.item.count}</span>
      <input name="tagTo" defaultValue={props.item.tag} className="admin-input" />
      <button className="admin-button" disabled={props.pending} type="submit">重命名</button>
      <button
        className="admin-danger"
        disabled={props.pending}
        type="button"
        onClick={() => {
          const form = new FormData();
          form.set("tag", props.item.tag);
          props.onRun(async () => deleteTag(form), `已删除标签：${props.item.tag}`);
        }}
      >
        删除
      </button>
    </form>
  );
}

function submit(
  event: React.FormEvent<HTMLFormElement>,
  onRun: (action: () => Promise<void>, done: string) => void,
  action: (formData: FormData) => Promise<void>,
  done: string,
) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  onRun(async () => action(form), done);
}

function countCategories(stickers: readonly Sticker[]) {
  const counts = new Map<string, number>();
  stickers.forEach((sticker) => counts.set(sticker.category, (counts.get(sticker.category) ?? 0) + 1));
  return counts;
}

function countTags(stickers: readonly Sticker[]) {
  const counts = new Map<string, number>();
  stickers.forEach((sticker) => sticker.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
