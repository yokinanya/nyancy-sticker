"use client";

import { Checkbox } from "@/components/ui/heroui-compat";
import type { AdminStickerRow, StickerSort } from "@/lib/queries/admin-stickers";
import type { Category } from "@/lib/types";
import { StickerDesktopRow } from "./stickers-desktop-row";
import {
  CategoryFilterContent,
  StatusFilterContent,
  TextFilterContent,
} from "./stickers-table-filter-fields";
import { FilterHeader } from "./stickers-table-header";
import {
  categoryDisplayName,
  createCategoryDisplayMap,
  type StickerFilterUpdates,
  type StickerTableFilters,
} from "./stickers-table-query";

interface Props {
  categories: readonly Category[];
  filters: StickerTableFilters;
  items: readonly AdminStickerRow[];
  onApplyFilter: (updates: StickerFilterUpdates) => void;
  onEdit: (item: AdminStickerRow) => void;
  onSort: (sort: StickerSort) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  selectedSet: ReadonlySet<string>;
  sort: StickerSort;
}

export function StickersDesktopTable({
  categories,
  filters,
  items,
  onApplyFilter,
  onEdit,
  onSort,
  onToggle,
  onToggleAll,
  selectedSet,
  sort,
}: Props) {
  const categoryDisplayMap = createCategoryDisplayMap(categories);
  return (
    <div className="desktop-table-wrap overflow-x-auto rounded-lg border border-border-subtle bg-surface/80 shadow-sm">
      <table className="w-full min-w-[980px] text-left text-sm">
        <StickerTableHead
          categories={categories}
          filters={filters}
          items={items}
          onApplyFilter={onApplyFilter}
          onSort={onSort}
          onToggleAll={onToggleAll}
          selectedSet={selectedSet}
          sort={sort}
        />
        <StickerTableBody
          categoryDisplayMap={categoryDisplayMap}
          items={items}
          onEdit={onEdit}
          onToggle={onToggle}
          selectedSet={selectedSet}
        />
      </table>
    </div>
  );
}

function StickerTableHead({
  categories,
  filters,
  items,
  onApplyFilter,
  onSort,
  onToggleAll,
  selectedSet,
  sort,
}: Omit<Props, "onEdit" | "onToggle">) {
  return (
    <thead className="border-b border-border-subtle bg-surface-muted/70 text-xs text-default-500">
      <tr>
        <th className="w-10 p-3">
          <Checkbox
            aria-label="全选"
            isSelected={items.length > 0 && items.every((item) => selectedSet.has(item.id))}
            onChange={onToggleAll}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox>
        </th>
        <th className="p-3">预览</th>
        <NameHeader filters={filters} onApplyFilter={onApplyFilter} onSort={onSort} sort={sort} />
        <CategoryHeader categories={categories} filters={filters} onApplyFilter={onApplyFilter} onSort={onSort} sort={sort} />
        <th className="p-3">标签</th>
        <StatusHeader filters={filters} onApplyFilter={onApplyFilter} onSort={onSort} sort={sort} />
        <SubmitterHeader filters={filters} onApplyFilter={onApplyFilter} onSort={onSort} sort={sort} />
        <th className="p-3">操作</th>
      </tr>
    </thead>
  );
}

function StickerTableBody({
  categoryDisplayMap,
  items,
  onEdit,
  onToggle,
  selectedSet,
}: Pick<Props, "items" | "onEdit" | "onToggle" | "selectedSet"> & {
  categoryDisplayMap: ReadonlyMap<string, string>;
}) {
  if (items.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={8} className="p-6 text-center text-default-400">
            没有匹配的贴纸。调整筛选或翻页试试。
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {items.map((item) => (
        <StickerDesktopRow
          key={item.id}
          item={item}
          categoryDisplay={categoryDisplayName(categoryDisplayMap, item.categoryId)}
          selected={selectedSet.has(item.id)}
          onEdit={onEdit}
          onToggle={onToggle}
        />
      ))}
    </tbody>
  );
}

function NameHeader({ filters, onApplyFilter, onSort, sort }: HeaderProps) {
  return (
    <FilterHeader active={!!filters.q} asc="name" desc="name-desc" label="名字" onSort={onSort} sort={sort}>
      {(close) => (
        <TextFilterContent
          filterKey="q"
          label="搜索名称 / ID / 标签"
          value={filters.q}
          onApply={(updates) => applyAndClose(updates, onApplyFilter, close)}
        />
      )}
    </FilterHeader>
  );
}

function CategoryHeader({ categories, filters, onApplyFilter, onSort, sort }: HeaderProps & {
  categories: readonly Category[];
}) {
  return (
    <FilterHeader
      active={!!filters.character || !!filters.category}
      asc="category"
      desc="category-desc"
      label="分类"
      onSort={onSort}
      sort={sort}
    >
      {(close) => (
        <CategoryFilterContent
          categories={categories}
          filters={filters}
          onApply={(updates) => applyAndClose(updates, onApplyFilter, close)}
        />
      )}
    </FilterHeader>
  );
}

function StatusHeader({ filters, onApplyFilter, onSort, sort }: HeaderProps) {
  return (
    <FilterHeader active={!!filters.status} asc="status" desc="status-desc" label="状态" onSort={onSort} sort={sort}>
      {(close) => (
        <StatusFilterContent
          value={filters.status}
          onApply={(updates) => applyAndClose(updates, onApplyFilter, close)}
        />
      )}
    </FilterHeader>
  );
}

function SubmitterHeader({ filters, onApplyFilter, onSort, sort }: HeaderProps) {
  return (
    <FilterHeader
      active={!!filters.submitter}
      asc="submitter"
      desc="submitter-desc"
      label="投稿者"
      onSort={onSort}
      sort={sort}
    >
      {(close) => (
        <TextFilterContent
          filterKey="submitter"
          label="GitHub / 昵称 / 用户 ID"
          value={filters.submitter}
          onApply={(updates) => applyAndClose(updates, onApplyFilter, close)}
        />
      )}
    </FilterHeader>
  );
}

interface HeaderProps {
  filters: StickerTableFilters;
  onApplyFilter: (updates: StickerFilterUpdates) => void;
  onSort: (sort: StickerSort) => void;
  sort: StickerSort;
}

function applyAndClose(
  updates: StickerFilterUpdates,
  onApplyFilter: (updates: StickerFilterUpdates) => void,
  close: () => void,
) {
  onApplyFilter(updates);
  close();
}
