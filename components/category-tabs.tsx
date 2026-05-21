"use client";

import { Tabs } from "@heroui/react";
import { useFilterStore } from "@/lib/store";
import type { Category } from "@/lib/types";

interface Props {
  categories: Category[];
  counts: Record<string, number>;
  total: number;
}

export function CategoryTabs({ categories, counts, total }: Props) {
  const category = useFilterStore((s) => s.category);
  const setCategory = useFilterStore((s) => s.setCategory);

  const selected = category ?? "__all";

  return (
    <Tabs
      aria-label="分类"
      selectedKey={selected}
      onSelectionChange={(k) => setCategory(k === "__all" ? null : String(k))}
    >
      <Tabs.List aria-label="分类">
        <Tabs.Tab id="__all">全部 · {total}</Tabs.Tab>
        {categories.map((c) => (
          <Tabs.Tab key={c.id} id={c.id}>
            {c.emoji ? `${c.emoji} ` : ""}
            {c.name} · {counts[c.id] ?? 0}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
