"use client";

import { Autocomplete, Input, ListBox } from "@heroui/react";
import { useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";

interface Props {
  categories: readonly Category[];
  value: string;
  name?: string;
  onChange?: (value: string) => void;
  triggerClassName?: string;
}

export function CategorySelect({ categories, value, name, onChange, triggerClassName }: Props) {
  const [localValue, setLocalValue] = useState(value);
  const [query, setQuery] = useState("");
  const selected = onChange ? value : localValue;
  const filteredCategories = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return categories;
    return categories.filter((category) => {
      const label = categoryLabel(category).toLowerCase();
      return label.includes(text) || category.id.toLowerCase().includes(text);
    });
  }, [categories, query]);

  return (
    <>
      {name ? <input name={name} type="hidden" value={selected} /> : null}
      <Autocomplete
        aria-label="分类"
        selectedKey={selected}
        onSelectionChange={(key) => {
          const nextValue = key === null ? "" : String(key);
          setLocalValue(nextValue);
          onChange?.(nextValue);
        }}
        className="w-full min-w-0 sm:min-w-44"
      >
        <Autocomplete.Trigger
          className={`field-trigger flex min-w-0 items-center gap-2 ${triggerClassName ?? ""}`}
        >
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
              {filteredCategories.map((category) => (
                <ListBox.Item
                  key={category.id}
                  id={category.id}
                  textValue={categoryLabel(category)}
                  className="listbox-option"
                >
                  {categoryLabel(category)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </>
  );
}
