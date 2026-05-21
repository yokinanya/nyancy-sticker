"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Category, Sticker } from "@/lib/types";
import { updateSticker } from "./actions";
import { CategorySelect } from "./category-select";

const PAGE_SIZE = 20;

interface Props {
  categories: readonly Category[];
  stickers: readonly Sticker[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onRun: (action: () => Promise<void>, done: string) => void;
}

export function StickerTable(props: Props) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(props.stickers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStickers = useMemo(
    () => props.stickers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, props.stickers],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="w-12 p-3">选择</th>
              <th className="p-3">预览</th>
              <th className="p-3">名称</th>
              <th className="p-3">分类</th>
              <th className="p-3">标签</th>
              <th className="p-3">操作</th>
              <th className="p-3">ID</th>
              <th className="p-3">尺寸</th>
            </tr>
          </thead>
          <tbody>
            {pageStickers.map((sticker) => (
              <StickerRow key={sticker.id} {...props} sticker={sticker} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        pageCount={pageCount}
        total={props.stickers.length}
        onPageChange={setPage}
      />
    </div>
  );
}

function StickerRow(props: Props & { sticker: Sticker }) {
  const [name, setName] = useState(props.sticker.name);
  const [category, setCategory] = useState(props.sticker.category);
  const [tags, setTags] = useState(props.sticker.tags.join(", "));
  const save = () => {
    const form = new FormData();
    form.set("id", props.sticker.id);
    form.set("editName", name);
    form.set("editCategory", category);
    form.set("editTags", tags);
    props.onRun(async () => updateSticker(form), `已更新：${props.sticker.id}`);
  };

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
      <td className="p-3">
        <input
          type="checkbox"
          checked={props.selected.has(props.sticker.id)}
          onChange={() => props.onToggle(props.sticker.id)}
        />
      </td>
      <td className="p-3"><Preview sticker={props.sticker} /></td>
      <td className="p-3">
        <input value={name} onChange={(event) => setName(event.target.value)} className="admin-input w-full" />
      </td>
      <td className="p-3">
        <CategorySelect categories={props.categories} value={category} onChange={setCategory} />
      </td>
      <td className="p-3">
        <input value={tags} onChange={(event) => setTags(event.target.value)} className="admin-input w-full" />
      </td>
      <td className="p-3">
        <button type="button" className="admin-button" onClick={save}>保存</button>
      </td>
      <td className="p-3 text-xs text-zinc-500">{props.sticker.id}</td>
      <td className="p-3 text-xs text-zinc-500">
        {props.sticker.width}x{props.sticker.height} · {props.sticker.ext}
      </td>
    </tr>
  );
}

function Preview({ sticker }: { sticker: Sticker }) {
  return (
    <div className="relative h-12 w-12 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
      <Image
        src={sticker.thumb ?? sticker.src}
        alt={sticker.name}
        fill
        sizes="48px"
        className="object-contain p-1"
        unoptimized={sticker.ext === "gif"}
      />
    </div>
  );
}

function Pagination(props: {
  currentPage: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
      <span>
        第 {props.currentPage} / {props.pageCount} 页 · 共 {props.total} 条
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="admin-button"
          disabled={props.currentPage <= 1}
          onClick={() => props.onPageChange(props.currentPage - 1)}
        >
          上一页
        </button>
        <button
          type="button"
          className="admin-button"
          disabled={props.currentPage >= props.pageCount}
          onClick={() => props.onPageChange(props.currentPage + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
