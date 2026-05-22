"use client";

import { Tabs } from "@heroui/react";
import { useEffect, useMemo } from "react";
import { useFilterStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { childCategoryIds, topLevelCategories } from "@/lib/categories";

interface Props {
  categories: Category[];
  counts: Record<string, number>;
  hideTopLevel?: boolean;
}

const scrollableTabListClass =
  "flex! w-full max-w-full min-w-0 flex-nowrap overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const tabClass =
  "w-auto! flex-[1_0_max-content]! whitespace-nowrap";

export function CategoryTabs({ categories, counts, hideTopLevel = false }: Props) {
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
      {hideTopLevel ? null : (
        <Tabs
          aria-label="角色"
          selectedKey={activeParent?.id ?? undefined}
          onSelectionChange={(k) => selectTopCategory(String(k))}
        >
          <Tabs.List
            aria-label="角色"
            className={scrollableTabListClass}
          >
            {topLevelCategories(categories).map((c) => (
              <Tabs.Tab key={c.id} id={c.id} className={tabClass}>
                {c.name} · {counts[c.id] ?? 0}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}
      {childCategories.length > 0 ? (
        <Tabs
          aria-label="分类"
          selectedKey={selectedCategory ?? undefined}
          onSelectionChange={(k) => setCategory(String(k))}
        >
          <Tabs.List
            aria-label="分类"
            className={scrollableTabListClass}
          >
            {childCategories.map((c) => (
              <Tabs.Tab key={c.id} id={c.id} className={tabClass}>
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
