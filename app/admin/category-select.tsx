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
}

export function CategorySelect({ categories, value, name, onChange }: Props) {
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
        className="min-w-44"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {categories.map((category) => (
              <ListBox.Item key={category.id} id={category.id} textValue={category.name}>
                {category.id === "__root" ? category.name : categoryLabel(category)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </>
  );
}
