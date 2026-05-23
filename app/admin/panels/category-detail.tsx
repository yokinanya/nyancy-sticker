"use client";

import { Button, Chip } from "@heroui/react";
import { deleteCategory } from "@/app/admin/actions";
import type { CategoryWithCount } from "@/lib/queries/categories";
import type { SubmitHandler } from "./category-manager-types";

interface CategoryDetailProps {
  selected: CategoryWithCount | null;
  subcategories: readonly CategoryWithCount[];
  pending: boolean;
  onAddSubcategory: () => void;
  onEdit: (category: CategoryWithCount) => void;
  onSubmit: SubmitHandler;
}

export function CategoryDetail({
  selected,
  subcategories,
  pending,
  onAddSubcategory,
  onEdit,
  onSubmit,
}: CategoryDetailProps) {
  if (!selected) {
    return <p className="admin-panel p-6 text-center text-sm text-default-500">先新增一个角色。</p>;
  }

  return (
    <section className="admin-panel overflow-hidden">
      <DetailHeader
        category={selected}
        childCount={subcategories.length}
        onAddSubcategory={onAddSubcategory}
        onEdit={() => onEdit(selected)}
      />
      <SubcategoryList
        items={subcategories}
        pending={pending}
        onEdit={onEdit}
        onSubmit={onSubmit}
      />
    </section>
  );
}

function DetailHeader({
  category,
  childCount,
  onAddSubcategory,
  onEdit,
}: {
  category: CategoryWithCount;
  childCount: number;
  onAddSubcategory: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="border-b border-default-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="admin-section-title">{category.name}</h2>
            <Chip size="sm" variant="soft">
              <Chip.Label>{childCount} 个子分类</Chip.Label>
            </Chip>
          </div>
          <MetaLine category={category} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onPress={onEdit} className="motion-press">
            编辑角色
          </Button>
          <Button size="sm" variant="primary" onPress={onAddSubcategory} className="motion-press">
            新增分类
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubcategoryList({
  items,
  pending,
  onEdit,
  onSubmit,
}: {
  items: readonly CategoryWithCount[];
  pending: boolean;
  onEdit: (category: CategoryWithCount) => void;
  onSubmit: SubmitHandler;
}) {
  if (items.length === 0) {
    return <p className="p-6 text-sm text-default-400">暂无子分类。</p>;
  }

  return (
    <ul className="divide-y divide-default-100">
      {items.map((item) => (
        <CategoryRow
          key={item.id}
          category={item}
          pending={pending}
          onEdit={() => onEdit(item)}
          onSubmit={onSubmit}
        />
      ))}
    </ul>
  );
}

function CategoryRow({
  category,
  pending,
  onEdit,
  onSubmit,
}: {
  category: CategoryWithCount;
  pending: boolean;
  onEdit: () => void;
  onSubmit: SubmitHandler;
}) {
  const onDelete = () => {
    if (!window.confirm(`确认删除分类 ${category.id}？`)) return;
    const fd = new FormData();
    fd.set("categoryId", category.id);
    onSubmit(deleteCategory, fd, `已删除：${category.id}`);
  };

  return (
    <li className="motion-list-item grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{category.name}</span>
          <Chip size="sm" variant="soft">
            <Chip.Label>{category.count} 张</Chip.Label>
          </Chip>
        </div>
        <MetaLine category={category} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onPress={onEdit} className="motion-press">
          编辑
        </Button>
        <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete} className="motion-press">
          删除
        </Button>
      </div>
    </li>
  );
}

function MetaLine({ category }: { category: CategoryWithCount }) {
  const creator = category.createdByLogin ? `@${category.createdByLogin}` : (category.createdByName ?? "-");

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-default-400">
      <span className="font-mono">{category.id}</span>
      <span>{creator}</span>
      <span>{new Date(category.createdAt).toLocaleDateString("zh-CN")}</span>
    </div>
  );
}
