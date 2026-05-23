"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Autocomplete, Button, Input, ListBox, Select } from "@heroui/react";
import type { Category } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";

const STATUS_OPTIONS = [
  { value: "__all", label: "全部状态" },
  { value: "approved", label: "已发布" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "已拒绝" },
];
interface Current {
  status?: string;
  character?: string;
  category?: string;
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
  const [q, setQ] = useState(current.q ?? "");
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
    setOrDel(params, "q", q);
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const reset = () => {
    setStatus("__all");
    setCharacter("");
    setCategory("");
    setQ("");
    startTransition(() => router.push("/admin?tab=stickers"));
  };

  return (
    <section className="admin-panel p-4">
      <div className="flex justify-end md:hidden">
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
            <Field label="搜索">
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") apply();
                }}
                placeholder="搜索名称 / ID / 标签"
                className="field-control"
              />
            </Field>
            <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(8rem,12rem)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto_auto]">
              <Field label="状态">
                <OptionSelect
                  ariaLabel="状态"
                  value={status}
                  onChange={setStatus}
                  options={STATUS_OPTIONS}
                />
              </Field>
              <Field label="角色">
                <CategoryAutocomplete
                  ariaLabel="角色"
                  options={[{ id: "", name: "全部角色" }, ...topLevels]}
                  value={character}
                  onChange={(v) => {
                    setCharacter(v);
                    setCategory("");
                  }}
                />
              </Field>
              <Field label="分类">
                <CategoryAutocomplete
                  ariaLabel="分类"
                  options={[{ id: "", name: character ? "不限分类" : "先选角色" }, ...children]}
                  value={category}
                  onChange={setCategory}
                  isDisabled={!character}
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
    </section>
  );
}

function CategoryAutocomplete({
  ariaLabel,
  options,
  value,
  onChange,
  isDisabled = false,
}: {
  ariaLabel: string;
  options: readonly Category[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return options;
    return options.filter((option) => {
      const label = categoryLabel(option).toLowerCase();
      return label.includes(text) || option.id.toLowerCase().includes(text);
    });
  }, [options, query]);

  return (
    <Autocomplete
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(key) => onChange(key === null ? "" : String(key))}
      isDisabled={isDisabled}
      className="w-full min-w-0"
    >
      <Autocomplete.Trigger className="field-trigger flex min-w-0 items-center gap-2">
        <Autocomplete.Value className="min-w-0 flex-1 truncate" />
        <Autocomplete.ClearButton />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="motion-popover popover-surface min-w-72 p-2">
        <div className="sticky top-0 z-10 bg-content1 pb-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索..."
            className="field-control"
          />
        </div>
        <Autocomplete.Filter>
          <ListBox>
            {filteredOptions.map((option) => (
              <ListBox.Item
                key={option.id}
                id={option.id}
                textValue={categoryLabel(option)}
                className="listbox-option"
              >
                {categoryLabel(option)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
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
