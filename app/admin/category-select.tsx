"use client";

import { ListBox, Select } from "@heroui/react";
import { useState } from "react";
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
  const selected = onChange ? value : localValue;

  return (
    <>
      {name ? <input name={name} type="hidden" value={selected} /> : null}
      <Select
        aria-label="分类"
        selectedKey={selected}
        onSelectionChange={(key) => {
          const nextValue = String(key);
          setLocalValue(nextValue);
          onChange?.(nextValue);
        }}
        className="w-full min-w-0 sm:min-w-44"
      >
        <Select.Trigger
          className={`field-trigger flex min-w-0 items-center gap-2 ${triggerClassName ?? ""}`}
        >
          <Select.Value className="min-w-0 flex-1 truncate" />
          <Select.Indicator className="ml-auto shrink-0" />
        </Select.Trigger>
        <Select.Popover className="motion-popover popover-surface">
          <ListBox>
            {categories.map((category) => (
              <ListBox.Item
                key={category.id}
                id={category.id}
                textValue={category.name}
                className="listbox-option"
              >
                {categoryLabel(category)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </>
  );
}
