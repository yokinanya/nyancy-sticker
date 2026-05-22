"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, ListBox, Select } from "@heroui/react";
import type { Category } from "@/lib/types";
import { CategorySelect } from "@/app/admin/category-select";

const STATUS_OPTIONS = [
  { value: "__all", label: "全部状态" },
  { value: "approved", label: "已发布" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "已拒绝" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "最新优先" },
  { value: "oldest", label: "最早优先" },
  { value: "name", label: "按名字" },
];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100].map((n) => ({
  value: String(n),
  label: `${n} 行`,
}));

interface Current {
  status?: string;
  character?: string;
  category?: string;
  tag?: string;
  q?: string;
  sort?: string;
  pageSize?: number;
}

interface Props {
  categories: readonly Category[];
  current: Current;
}

export function StickersFilters({ categories, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [status, setStatus] = useState(current.status || "__all");
  const [character, setCharacter] = useState(current.character ?? "");
  const [category, setCategory] = useState(current.category ?? "");
  const [tag, setTag] = useState(current.tag ?? "");
  const [q, setQ] = useState(current.q ?? "");
  const [sort, setSort] = useState(current.sort ?? "newest");
  const [pageSize, setPageSize] = useState(String(current.pageSize ?? 20));

  const topLevels = categories.filter((c) => !c.parentId);
  const children = character ? categories.filter((c) => c.parentId === character) : [];

  const apply = () => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "stickers");
    params.delete("page");
    setOrDel(params, "status", status === "__all" ? "" : status);
    setOrDel(params, "character", character);
    setOrDel(params, "category", category);
    setOrDel(params, "tag", tag);
    setOrDel(params, "q", q);
    setOrDel(params, "sort", sort === "newest" ? "" : sort);
    setOrDel(params, "pageSize", pageSize === "20" ? "" : pageSize);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const reset = () => {
    setStatus("__all");
    setCharacter("");
    setCategory("");
    setTag("");
    setQ("");
    setSort("newest");
    setPageSize("20");
    startTransition(() => router.push("/admin?tab=stickers"));
  };

  return (
    <section className="rounded-lg border border-default-200 bg-content1 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field label="状态">
          <OptionSelect
            ariaLabel="状态"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
        </Field>
        <Field label="角色">
          <CategorySelect
            categories={[{ id: "", name: "全部角色" }, ...topLevels]}
            value={character}
            onChange={(v) => {
              setCharacter(v);
              setCategory("");
            }}
          />
        </Field>
        <Field label="分类">
          {character ? (
            <CategorySelect
              categories={[{ id: "", name: "（不限）" }, ...children]}
              value={category}
              onChange={setCategory}
            />
          ) : (
            <span className="self-center text-xs text-default-400">先选角色</span>
          )}
        </Field>
        <Field label="标签">
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="单个标签" />
        </Field>
        <Field label="关键字（名字或 ID）">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索..." />
        </Field>
        <Field label="排序">
          <OptionSelect
            ariaLabel="排序"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-default-500">
          <span>每页</span>
          <OptionSelect
            ariaLabel="每页"
            value={pageSize}
            onChange={setPageSize}
            options={PAGE_SIZE_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onPress={reset} isPending={pending}>
            重置
          </Button>
          <Button variant="primary" onPress={apply} isPending={pending}>
            应用筛选
          </Button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}

function OptionSelect({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Select
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item key={o.value} id={o.value} textValue={o.label}>
              {o.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function setOrDel(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
  else params.delete(key);
}
