"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Checkbox, Chip, Input } from "@heroui/react";
import type { Category } from "@/lib/types";
import { CategorySelect } from "@/app/admin/category-select";
import { bulkUpdateStickers } from "@/app/admin/actions";
import type { AdminStickerRow, StickerStatus } from "@/lib/queries/admin-stickers";
import { StickerEditModal } from "./sticker-edit-modal";

const STATUS_LABEL: Record<StickerStatus, string> = {
  approved: "已发布",
  pending: "待审核",
  rejected: "已拒绝",
};

const STATUS_COLOR: Record<StickerStatus, "primary" | "secondary" | "soft"> = {
  approved: "primary",
  pending: "secondary",
  rejected: "soft",
};

interface Props {
  items: readonly AdminStickerRow[];
  categories: readonly Category[];
  page: number;
  pageCount: number;
  total: number;
}

export function StickersTable({ items, categories, page, pageCount, total }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [editing, setEditing] = useState<AdminStickerRow | null>(null);
  const [bulkCategory, setBulkCategory] = useState(categories[0]?.id ?? "");
  const [bulkTags, setBulkTags] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const toggleAll = () => {
    const ids = items.map((i) => i.id);
    const allSelected = ids.every((id) => selected.includes(id));
    setSelected(allSelected ? [] : ids);
  };
  const toggleOne = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const runBulk = (operation: string) => {
    if (selected.length === 0) return;
    if (operation === "delete" && !window.confirm(`确认删除 ${selected.length} 张贴纸？`)) return;
    const fd = new FormData();
    fd.set("operation", operation);
    fd.set("category", bulkCategory);
    fd.set("tags", bulkTags);
    selected.forEach((id) => fd.append("ids", id));
    startTransition(async () => {
      try {
        await bulkUpdateStickers(fd);
        setMessage(`已批量执行：${operation}`);
        setSelected([]);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "操作失败。");
      }
    });
  };

  const goPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 批量工具栏 */}
      <div className="rounded-lg border border-default-200 bg-content1 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-default-500">已选 {selected.length} 张</span>
          <CategorySelect
            categories={categories}
            value={bulkCategory}
            onChange={setBulkCategory}
          />
          <Button
            size="sm"
            variant="ghost"
            isPending={pending}
            onPress={() => runBulk("category")}
          >
            改分类
          </Button>
          <Input
            value={bulkTags}
            onChange={(e) => setBulkTags(e.target.value)}
            placeholder="标签（逗号分隔）"
            className="w-48"
          />
          <Button
            size="sm"
            variant="ghost"
            isPending={pending}
            onPress={() => runBulk("add-tags")}
          >
            加标签
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isPending={pending}
            onPress={() => runBulk("remove-tags")}
          >
            删标签
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isPending={pending}
            onPress={() => runBulk("delete")}
          >
            删除
          </Button>
        </div>
        {message ? <p className="mt-2 text-xs text-default-500">{message}</p> : null}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-default-200 bg-content1 shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-default-200 text-xs text-default-500">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  aria-label="全选"
                  isSelected={items.length > 0 && items.every((i) => selected.includes(i.id))}
                  onChange={toggleAll}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox>
              </th>
              <th className="p-3">预览</th>
              <th className="p-3">名字</th>
              <th className="p-3">分类</th>
              <th className="p-3">标签</th>
              <th className="p-3">状态</th>
              <th className="p-3">投稿者</th>
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
                  className="motion-list-item motion-interactive border-b border-default-100 hover:bg-default-50 last:border-0 dark:hover:bg-default-100/5"
                >
                  <td className="p-3">
                    <Checkbox
                      aria-label={`选择 ${item.name}`}
                      isSelected={selected.includes(item.id)}
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
                    <Chip size="sm" variant={STATUS_COLOR[item.status]}>
                      <Chip.Label>{STATUS_LABEL[item.status]}</Chip.Label>
                    </Chip>
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
                    <Button size="sm" variant="ghost" onPress={() => setEditing(item)}>
                      编辑
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-default-500">
        <span>
          第 {page} / {pageCount} 页 · 共 {total} 条
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" isDisabled={page <= 1} onPress={() => goPage(page - 1)}>
            上一页
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page >= pageCount}
            onPress={() => goPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>

      {/* 编辑弹窗 */}
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
    </div>
  );
}
