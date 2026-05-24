"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Autocomplete, Button, Input, ListBox, Select } from "@/components/ui/heroui-compat";
import type { Category, Character } from "@/lib/types";
import { STATUS_LABEL } from "./stickers-table-parts";
import type { StickerFilterUpdates, StickerTableFilters } from "./stickers-table-query";

const STATUS_OPTIONS = [
  { value: "__all", label: "全部状态" },
  { value: "approved", label: STATUS_LABEL.approved },
  { value: "pending", label: STATUS_LABEL.pending },
  { value: "rejected", label: STATUS_LABEL.rejected },
] as const;

export function TextFilterContent({
  filterKey,
  label,
  onApply,
  value,
}: {
  filterKey: "q" | "submitter";
  label: string;
  onApply: (updates: StickerFilterUpdates) => void;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const apply = () => onApply({ [filterKey]: draft.trim() });
  return (
    <div className="grid gap-2">
      <label className="text-xs text-default-500">{label}</label>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && apply()}
        className="field-control h-9 min-h-9"
      />
      <FilterActions onApply={apply} onReset={() => onApply({ [filterKey]: "" })} />
    </div>
  );
}

export function StatusFilterContent({
  onApply,
  value,
}: {
  onApply: (updates: StickerFilterUpdates) => void;
  value: string;
}) {
  const [draft, setDraft] = useState(value || "__all");
  return (
    <div className="grid gap-2">
      <label className="text-xs text-default-500">状态</label>
      <OptionSelect value={draft} options={STATUS_OPTIONS} onChange={setDraft} />
      <FilterActions
        onApply={() => onApply({ status: draft === "__all" ? "" : draft })}
        onReset={() => onApply({ status: "" })}
      />
    </div>
  );
}

export function CategoryFilterContent({
  categories,
  characters,
  filters,
  onApply,
}: {
  categories: readonly Category[];
  characters: readonly Character[];
  filters: StickerTableFilters;
  onApply: (updates: StickerFilterUpdates) => void;
}) {
  const [character, setCharacter] = useState(filters.character);
  const [category, setCategory] = useState(filters.category);
  const children = useMemo(
    () => categories.filter((item) => item.characterId === character),
    [categories, character],
  );

  return (
    <div className="grid gap-2">
      <Field label="角色">
        <CategoryAutocomplete
          value={character}
          options={[{ id: "", name: "全部角色" }, ...characters]}
          onChange={(value) => {
            setCharacter(value);
            setCategory("");
          }}
        />
      </Field>
      <Field label="分类">
        <CategoryAutocomplete
          value={category}
          options={[{ id: "", name: character ? "不限分类" : "======" }, ...children]}
          onChange={setCategory}
          isDisabled={!character}
        />
      </Field>
      <FilterActions
        onApply={() => onApply({ category, character })}
        onReset={() => onApply({ category: "", character: "" })}
      />
    </div>
  );
}

function FilterActions({ onApply, onReset }: { onApply: () => void; onReset: () => void }) {
  return (
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-default-200 bg-surface-raised/95 pt-3">
      <Button size="sm" variant="ghost" onPress={onReset}>
        清除
      </Button>
      <Button size="sm" variant="primary" onPress={onApply}>
        应用
      </Button>
    </div>
  );
}

function CategoryAutocomplete({
  isDisabled,
  onChange,
  options,
  value,
}: {
  isDisabled?: boolean;
  onChange: (value: string) => void;
  options: readonly (Category | Character)[];
  value: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterCategories(options, query), [options, query]);
  return (
    <Autocomplete selectedKey={value} onSelectionChange={(key) => onChange(String(key ?? ""))} isDisabled={isDisabled}>
      <Autocomplete.Trigger aria-label="分类筛选" className="field-trigger flex h-9 min-h-9 min-w-0 items-center gap-2">
        <Autocomplete.Value className="min-w-0 flex-1 truncate" />
        <Autocomplete.ClearButton />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="motion-popover popover-surface max-h-64 overflow-auto p-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索..." />
        <ListBox className="mt-2 max-h-48 overflow-auto">
          {filtered.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={optionLabel(option)} className="listbox-option">
              {optionLabel(option)}
            </ListBox.Item>
          ))}
        </ListBox>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

function OptionSelect({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  value: string;
}) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key))}>
      <Select.Trigger aria-label="状态筛选" className="field-trigger flex h-9 min-h-9 min-w-0 items-center gap-2">
        <Select.Value className="min-w-0 flex-1 truncate" />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface max-h-56 overflow-auto">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label} className="listbox-option">
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}

function filterCategories(options: readonly (Category | Character)[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return options;
  return options.filter((option) => {
    const label = optionLabel(option).toLowerCase();
    return label.includes(text) || option.id.toLowerCase().includes(text);
  });
}

function optionLabel(option: Category | Character) {
  return "slug" in option ? `${option.name} (${option.slug})` : option.name;
}
