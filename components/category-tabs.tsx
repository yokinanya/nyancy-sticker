"use client";

import { Tabs } from "@/components/ui/heroui-compat";
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

const scrollableTabListClass = "category-tab-list";

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
  const topCategories = useMemo(() => topLevelCategories(categories), [categories]);
  const childCategories = categories.filter((item) => childIds.includes(item.id));
  const selectTopCategory = (id: string) => {
    const firstChildId = childCategoryIds(categories, id)[0];
    onCategoryChange(firstChildId ?? id);
  };

  return (
    <div className="flex flex-col gap-2">
      {hideTopLevel ? null : (
        <CategoryTabGroup
          ariaLabel="角色"
          categories={topCategories}
          counts={counts}
          selectedKey={activeParent?.id}
          onSelectionChange={selectTopCategory}
        />
      )}
      {childCategories.length > 0 ? (
        <CategoryTabGroup
          ariaLabel="分类"
          categories={childCategories}
          counts={counts}
          selectedKey={effectiveCategory}
          onSelectionChange={onCategoryChange}
        />
      ) : null}
    </div>
  );
}

function CategoryTabGroup({
  ariaLabel,
  categories,
  counts,
  selectedKey,
  onSelectionChange,
}: {
  ariaLabel: string;
  categories: readonly Category[];
  counts: Record<string, number>;
  selectedKey?: string | null;
  onSelectionChange: (id: string) => void;
}) {
  return (
    <Tabs
      aria-label={ariaLabel}
      selectedKey={selectedKey ?? undefined}
      onSelectionChange={(key) => onSelectionChange(String(key))}
    >
      <Tabs.List aria-label={ariaLabel} className={scrollableTabListClass}>
        {categories.map((category) => (
          <CategoryTab key={category.id} category={category} count={counts[category.id] ?? 0} />
        ))}
      </Tabs.List>
    </Tabs>
  );
}

function CategoryTab({ category, count }: { category: Category; count: number }) {
  return (
    <Tabs.Tab
      id={category.id}
      className="category-tab ui-focus"
      title={`${category.name} · ${count}`}
    >
      <span className="category-tab-label">{category.name}</span>
      <span className="category-tab-count">{count}</span>
    </Tabs.Tab>
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
