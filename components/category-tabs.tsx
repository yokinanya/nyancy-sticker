"use client";

import { Tabs } from "@heroui/react";
import { useMemo } from "react";
import type { Category } from "@/lib/types";
import {
  childCategoryIds,
  defaultCategoryId,
  topLevelCategories,
} from "@/lib/categories";

interface Props {
  categories: Category[];
  counts: Record<string, number>;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  hideTopLevel?: boolean;
}

const scrollableTabListClass =
  "flex! w-full max-w-full min-w-0 flex-nowrap overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const tabClass =
  "motion-press ui-selected-tab w-auto! flex-[1_0_max-content]! whitespace-nowrap rounded-lg px-3 py-2";

export function CategoryTabs({
  categories,
  counts,
  selectedCategory,
  onCategoryChange,
  hideTopLevel = false,
}: Props) {
  const defaultCategory = useMemo(() => defaultCategoryId(categories), [categories]);
  const effectiveCategory = isValidCategory(categories, selectedCategory)
    ? selectedCategory
    : defaultCategory;
  const activeParent = findActiveParent(categories, effectiveCategory);
  const childIds = activeParent ? childCategoryIds(categories, activeParent.id) : [];
  const childCategories = categories.filter((item) => childIds.includes(item.id));
  const selectTopCategory = (id: string) => {
    const firstChildId = childCategoryIds(categories, id)[0];
    onCategoryChange(firstChildId ?? id);
  };

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
          selectedKey={effectiveCategory ?? undefined}
          onSelectionChange={(k) => onCategoryChange(String(k))}
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

function isValidCategory(categories: readonly Category[], category: string | null) {
  return Boolean(category && categories.some((item) => item.id === category));
}
