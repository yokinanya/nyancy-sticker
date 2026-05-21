"use client";

import { Tabs } from "@heroui/react";
import { useEffect, useMemo } from "react";
import { useFilterStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { childCategoryIds, topLevelCategories } from "@/lib/categories";

interface Props {
  categories: Category[];
  counts: Record<string, number>;
}

export function CategoryTabs({ categories, counts }: Props) {
  const category = useFilterStore((s) => s.category);
  const setCategory = useFilterStore((s) => s.setCategory);
  const defaultCategory = useMemo(() => findDefaultCategory(categories), [categories]);
  const selectedCategory = isValidCategory(categories, category) ? category : defaultCategory;
  const activeParent = findActiveParent(categories, selectedCategory);
  const childIds = activeParent ? childCategoryIds(categories, activeParent.id) : [];
  const childCategories = categories.filter((item) => childIds.includes(item.id));
  const selectTopCategory = (id: string) => {
    const firstChildId = childCategoryIds(categories, id)[0];
    setCategory(firstChildId ?? id);
  };

  useEffect(() => {
    if (selectedCategory && selectedCategory !== category) setCategory(selectedCategory);
  }, [category, selectedCategory, setCategory]);

  return (
    <div className="flex flex-col gap-2">
      <Tabs
        aria-label="一级分类"
        selectedKey={activeParent?.id ?? undefined}
        onSelectionChange={(k) => selectTopCategory(String(k))}
      >
        <Tabs.List aria-label="一级分类">
          {topLevelCategories(categories).map((c) => (
            <Tabs.Tab key={c.id} id={c.id}>
              {c.name} · {counts[c.id] ?? 0}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      {childCategories.length > 0 ? (
        <Tabs
          aria-label="二级分类"
          selectedKey={selectedCategory ?? undefined}
          onSelectionChange={(k) => setCategory(String(k))}
        >
          <Tabs.List aria-label="二级分类">
            {childCategories.map((c) => (
              <Tabs.Tab key={c.id} id={c.id}>
                {c.name} · {counts[c.id] ?? 0}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      ) : null}
    </div>
  );
}

function findActiveParent(categories: readonly Category[], selected: string | null) {
  if (!selected) return null;
  const current = categories.find((category) => category.id === selected);
  if (!current) return null;
  if (!current.parentId) return current;
  return categories.find((category) => category.id === current.parentId) ?? null;
}

function findDefaultCategory(categories: readonly Category[]) {
  const firstParent = topLevelCategories(categories)[0];
  if (!firstParent) return null;
  return childCategoryIds(categories, firstParent.id)[0] ?? firstParent.id;
}

function isValidCategory(categories: readonly Category[], category: string | null) {
  return Boolean(category && categories.some((item) => item.id === category));
}
