"use client";

import { useState } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { addCategory, deleteCategory, updateCategory } from "@/app/admin/actions";
import type { CategoryWithCount } from "@/lib/queries/categories";
import type { SubmitHandler } from "./category-manager-types";

interface CategoryDetailProps {
  selected: CategoryWithCount | null;
  subcategories: readonly CategoryWithCount[];
  pending: boolean;
  onSubmit: SubmitHandler;
}

export function CategoryDetail({
  selected,
  subcategories,
  pending,
  onSubmit,
}: CategoryDetailProps) {
  if (!selected) {
    return <p className="admin-panel p-6 text-center text-sm text-default-500">先新增一个角色。</p>;
  }

  return (
    <section className="admin-panel overflow-hidden">
      <DetailHeader category={selected} childCount={subcategories.length} />
      <div className="flex flex-col gap-4 p-3">
        <EditNameRow category={selected} pending={pending} onSubmit={onSubmit} />
        <AddSubcategoryForm parent={selected} pending={pending} onSubmit={onSubmit} />
        <SubcategoryList items={subcategories} pending={pending} onSubmit={onSubmit} />
      </div>
    </section>
  );
}

function DetailHeader({
  category,
  childCount,
}: {
  category: CategoryWithCount;
  childCount: number;
}) {
  return (
    <div className="border-b border-default-100 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="admin-section-title">{category.name}</h2>
        <span className="font-mono text-xs text-default-400">{category.id}</span>
        <Chip size="sm" variant="soft">
          <Chip.Label>{childCount} 个子分类</Chip.Label>
        </Chip>
      </div>
      <MetaLine category={category} />
    </div>
  );
}

function EditNameRow({
  category,
  pending,
  onSubmit,
}: {
  category: CategoryWithCount;
  pending: boolean;
  onSubmit: SubmitHandler;
}) {
  const [name, setName] = useState(category.name);

  const onSave = () => {
    const fd = new FormData();
    fd.set("categoryId", category.id);
    fd.set("categoryName", name);
    fd.set("parentId", "");
    onSubmit(updateCategory, fd, `已更新角色：${category.id}`);
  };

  const onDelete = () => {
    if (!window.confirm(`确认删除角色「${category.name}」？只能删除没有子分类的角色。`)) return;
    const fd = new FormData();
    fd.set("categoryId", category.id);
    onSubmit(deleteCategory, fd, `已删除角色：${category.id}`);
  };

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="field-control px-3" />
      <Button size="sm" variant="ghost" isPending={pending} isDisabled={name === category.name} onPress={onSave}>
        保存角色
      </Button>
      <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete}>
        删除角色
      </Button>
    </div>
  );
}

function AddSubcategoryForm({
  parent,
  pending,
  onSubmit,
}: {
  parent: CategoryWithCount;
  pending: boolean;
  onSubmit: SubmitHandler;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const onAdd = () => {
    const fd = new FormData();
    fd.set("categoryId", id);
    fd.set("categoryName", name);
    fd.set("parentId", parent.id);
    onSubmit(addCategory, fd, `已新增子分类：${id}`);
    setId("");
    setName("");
  };

  return (
    <div className="rounded-lg border border-default-100 p-3">
      <h3 className="mb-2 text-sm font-medium">新增子分类</h3>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="id（slug）" className="field-control px-3" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="显示名" className="field-control px-3" />
        <Button variant="primary" isPending={pending} onPress={onAdd}>
          新增
        </Button>
      </div>
    </div>
  );
}

function SubcategoryList({
  items,
  pending,
  onSubmit,
}: {
  items: readonly CategoryWithCount[];
  pending: boolean;
  onSubmit: SubmitHandler;
}) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-default-100 p-4 text-sm text-default-400">暂无子分类。</p>;
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-default-100">
      {items.map((item) => (
        <CategoryRow key={item.id} category={item} pending={pending} onSubmit={onSubmit} />
      ))}
    </ul>
  );
}

function CategoryRow({
  category,
  pending,
  onSubmit,
}: {
  category: CategoryWithCount;
  pending: boolean;
  onSubmit: SubmitHandler;
}) {
  const [name, setName] = useState(category.name);

  const onSave = () => {
    const fd = new FormData();
    fd.set("categoryId", category.id);
    fd.set("categoryName", name);
    fd.set("parentId", category.parentId ?? "");
    onSubmit(updateCategory, fd, `已更新：${category.id}`);
  };

  const onDelete = () => {
    if (!window.confirm(`确认删除分类 ${category.id}？`)) return;
    const fd = new FormData();
    fd.set("categoryId", category.id);
    onSubmit(deleteCategory, fd, `已删除：${category.id}`);
  };

  return (
    <li className="motion-list-item border-b border-default-100 p-3 last:border-0">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="field-control px-3" />
          <MetaLine category={category} />
        </div>
        <Button size="sm" variant="ghost" isPending={pending} isDisabled={name === category.name} onPress={onSave}>
          保存
        </Button>
        <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete}>
          删除
        </Button>
      </div>
    </li>
  );
}

function MetaLine({ category }: { category: CategoryWithCount }) {
  const creator = category.createdByLogin ? `@${category.createdByLogin}` : (category.createdByName ?? "—");

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-default-400">
      <span className="font-mono">{category.id}</span>
      <span>{category.count} 张</span>
      <span>{creator}</span>
      <span>{new Date(category.createdAt).toLocaleDateString("zh-CN")}</span>
    </div>
  );
}
