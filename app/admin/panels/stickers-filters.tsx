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
  { value: "grouped", label: "默认排序" },
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
  const [sort, setSort] = useState(current.sort ?? "grouped");
  const [pageSize, setPageSize] = useState(String(current.pageSize ?? 20));
  const [expanded, setExpanded] = useState(false);

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
    setOrDel(params, "sort", sort === "grouped" ? "" : sort);
    setOrDel(params, "pageSize", pageSize === "20" ? "" : pageSize);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const reset = () => {
    setStatus("__all");
    setCharacter("");
    setCategory("");
    setTag("");
    setQ("");
    setSort("grouped");
    setPageSize("20");
    startTransition(() => router.push("/admin?tab=stickers"));
  };

  return (
    <section className="admin-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="admin-section-title">筛选贴纸</h2>
          <p className="admin-section-description mt-1">{filterSummary(current)}</p>
        </div>
        <Button
          variant="ghost"
          className="motion-press md:hidden"
          onPress={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起筛选" : "展开筛选"}
        </Button>
      </div>
      <div className="collapsible-panel md-open" data-open={expanded}>
        <div className="collapsible-body">
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 items-end gap-2 lg:grid-cols-4">
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
                  <div className="field-trigger flex items-center text-sm text-default-400">
                    先选角色
                  </div>
                )}
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
            <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(10rem,16rem)_minmax(16rem,1fr)] lg:grid-cols-[minmax(10rem,14rem)_minmax(20rem,1fr)_auto]">
              <Field label="标签">
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="单个标签"
                  className="field-control"
                />
              </Field>
              <Field label="关键字">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="名字或 ID"
                  className="field-control"
                />
              </Field>
              <div className="grid grid-cols-[minmax(4.5rem,6rem)_auto_auto] items-end gap-2 md:col-span-2 md:justify-self-end lg:col-span-1">
                <Field label="每页" className="w-full">
                  <OptionSelect
                    ariaLabel="每页"
                    value={pageSize}
                    onChange={setPageSize}
                    options={PAGE_SIZE_OPTIONS}
                  />
                </Field>
                <Button variant="ghost" onPress={reset} isPending={pending} className="motion-press">
                  重置
                </Button>
                <Button variant="primary" onPress={apply} isPending={pending} className="motion-press">
                  应用筛选
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
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
      className="w-full min-w-0"
    >
      <Select.Trigger className="field-trigger flex w-full min-w-0 items-center gap-2">
        <Select.Value className="min-w-0 flex-1 truncate" />
        <Select.Indicator className="ml-auto shrink-0" />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface">
        <ListBox>
          {options.map((o) => (
            <ListBox.Item
              key={o.value}
              id={o.value}
              textValue={o.label}
              className="listbox-option"
            >
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

function filterSummary(current: Current) {
  const parts = [
    current.status ? "状态" : null,
    current.character ? "角色" : null,
    current.category ? "分类" : null,
    current.tag ? `#${current.tag}` : null,
    current.q ? `“${current.q}”` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "全部贴纸";
}
