"use client";

import { Tabs } from "@/components/ui/heroui-compat";
import { useMemo } from "react";
import type { Category } from "@/lib/types";
import { defaultCategoryId } from "@/lib/categories";

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
}: Props) {
  const defaultCategory = useMemo(() => defaultCategoryId(categories), [categories]);
  const effectiveCategory = isValidCategory(categories, selectedCategory)
    ? selectedCategory
    : defaultCategory;

  return (
    <div className="flex flex-col gap-2">
      {categories.length > 0 ? (
        <CategoryTabGroup
          ariaLabel="分类"
          categories={categories}
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

function isValidCategory(categories: readonly Category[], category: string | null) {
  return Boolean(category && categories.some((item) => item.id === category));
}
