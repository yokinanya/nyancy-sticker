"use client";

import { Tabs } from "@/components/ui/heroui-compat";
import { useMemo } from "react";
import type { Category } from "@/lib/types";
import { allCategoryCount, defaultGalleryCategoryId } from "@/lib/categories";

interface Props {
  categories: Category[];
  counts: Record<string, number>;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  showAllCategoryTab?: boolean;
}

const ALL_CATEGORY_TAB_ID = "__all__";
const scrollableTabListClass = "category-tab-list";

export function CategoryTabs({
  categories,
  counts,
  selectedCategory,
  onCategoryChange,
  showAllCategoryTab = false,
}: Props) {
  const defaultCategory = useMemo(
    () => defaultGalleryCategoryId(categories, showAllCategoryTab),
    [categories, showAllCategoryTab],
  );
  const effectiveCategory = isValidCategory(categories, selectedCategory)
    ? selectedCategory
    : defaultCategory;
  const selectedKey = effectiveCategory ?? (showAllCategoryTab ? ALL_CATEGORY_TAB_ID : undefined);

  return (
    <div className="flex flex-col gap-2">
      {categories.length > 0 ? (
        <CategoryTabGroup
          ariaLabel="分类"
          categories={categories}
          counts={counts}
          selectedKey={selectedKey}
          showAllCategoryTab={showAllCategoryTab}
          onSelectionChange={(id) => {
            onCategoryChange(id === ALL_CATEGORY_TAB_ID ? null : id);
          }}
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
  showAllCategoryTab,
  onSelectionChange,
}: {
  ariaLabel: string;
  categories: readonly Category[];
  counts: Record<string, number>;
  selectedKey?: string;
  showAllCategoryTab: boolean;
  onSelectionChange: (id: string) => void;
}) {
  return (
    <Tabs
      aria-label={ariaLabel}
      selectedKey={selectedKey ?? undefined}
      onSelectionChange={(key) => onSelectionChange(String(key))}
    >
      <Tabs.List aria-label={ariaLabel} className={scrollableTabListClass}>
        {showAllCategoryTab ? <AllCategoryTab count={allCategoryCount(counts)} /> : null}
        {categories.map((category) => (
          <CategoryTab key={category.id} category={category} count={counts[category.id] ?? 0} />
        ))}
      </Tabs.List>
    </Tabs>
  );
}

function AllCategoryTab({ count }: { count: number }) {
  return (
    <Tabs.Tab
      id={ALL_CATEGORY_TAB_ID}
      className="category-tab ui-focus"
      title={`全部 · ${count}`}
    >
      <span className="category-tab-label">全部</span>
      <span className="category-tab-count">{count}</span>
    </Tabs.Tab>
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
