"use client";

import { useState } from "react";
import { Button, Chip } from "@/components/ui/heroui-compat";
import { deleteCategory, deleteCharacter } from "@/app/admin/actions";
import type { CategoryWithCount, CharacterWithCount } from "@/lib/queries/categories";
import type { SubmitHandler } from "./category-manager-types";

interface CategoryDetailProps {
  selected: CharacterWithCount | null;
  subcategories: readonly CategoryWithCount[];
  pending: boolean;
  onAddSubcategory: () => void;
  onEditCategory: (category: CategoryWithCount) => void;
  onEditCharacter: (character: CharacterWithCount) => void;
  onSubmit: SubmitHandler;
}

export function CategoryDetail({
  selected,
  subcategories,
  pending,
  onAddSubcategory,
  onEditCategory,
  onEditCharacter,
  onSubmit,
}: CategoryDetailProps) {
  if (!selected) {
    return <p className="admin-panel p-6 text-center text-sm text-default-500">先新增一个角色。</p>;
  }

  return (
    <section className="grid gap-4">
      <RoleOverview
        role={selected}
        childCount={subcategories.length}
        totalCount={selected.count}
        onAddSubcategory={onAddSubcategory}
        onEdit={() => onEditCharacter(selected)}
        onSubmit={onSubmit}
      />
      <SubcategoryTable items={subcategories} pending={pending} onEdit={onEditCategory} onSubmit={onSubmit} />
    </section>
  );
}

function RoleOverview({
  role,
  childCount,
  totalCount,
  onAddSubcategory,
  onEdit,
  onSubmit,
}: {
  role: CharacterWithCount;
  childCount: number;
  totalCount: number;
  onAddSubcategory: () => void;
  onEdit: () => void;
  onSubmit: SubmitHandler;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const onDelete = () => {
    const fd = new FormData();
    fd.set("characterId", role.id);
    onSubmit(deleteCharacter, fd, `已删除：${role.id}`);
    setConfirmingDelete(false);
  };
  return (
    <div className="admin-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{role.name}</h2>
            <Chip size="sm" variant="primary">
              <Chip.Label>{totalCount} 张</Chip.Label>
            </Chip>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-default-400">{role.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onPress={onEdit} className="motion-press">
            编辑角色
          </Button>
          {confirmingDelete ? (
            <Button size="sm" variant="ghost" onPress={onDelete} className="motion-press border border-danger/30 text-danger">
              确认删除
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onPress={() => setConfirmingDelete(true)} className="motion-press">
              删除角色
            </Button>
          )}
          <Button size="sm" variant="primary" onPress={onAddSubcategory} className="motion-press">
            新增分类
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <SummaryItem label="子分类" value={`${childCount} 个`} />
        <SummaryItem label="创建者" value={creatorName(role)} />
        <SummaryItem label="创建时间" value={formatDate(role.createdAt)} />
      </div>
    </div>
  );
}

function SubcategoryTable({
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
  return (
    <div className="admin-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-default-100 p-3">
        <div>
          <h3 className="admin-section-title">子分类</h3>
          <p className="admin-section-description">当前角色下的直接分类</p>
        </div>
        <Chip size="sm" variant="soft">
          <Chip.Label>{items.length}</Chip.Label>
        </Chip>
      </div>
      {items.length === 0 ? <EmptySubcategory /> : <SubcategoryRows items={items} pending={pending} onEdit={onEdit} onSubmit={onSubmit} />}
    </div>
  );
}

function SubcategoryRows({
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-default-100 bg-surface-muted/70 text-xs text-default-500">
          <tr>
            <th className="p-3">名称</th>
            <th className="p-3">ID</th>
            <th className="p-3">贴纸</th>
            <th className="p-3">创建者</th>
            <th className="p-3">创建时间</th>
            <th className="p-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <SubcategoryRow key={item.id} category={item} pending={pending} onEdit={onEdit} onSubmit={onSubmit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubcategoryRow({
  category,
  pending,
  onEdit,
  onSubmit,
}: {
  category: CategoryWithCount;
  pending: boolean;
  onEdit: (category: CategoryWithCount) => void;
  onSubmit: SubmitHandler;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const onDelete = () => {
    const fd = new FormData();
    fd.set("categoryId", category.id);
    onSubmit(deleteCategory, fd, `已删除：${category.id}`);
    setConfirmingDelete(false);
  };

  return (
    <tr className="motion-list-item border-b border-default-100 last:border-0 hover:bg-primary/6">
      <td className="p-3 font-medium">{category.name}</td>
      <td className="p-3 font-mono text-xs text-default-500">{category.slug}</td>
      <td className="p-3 text-default-500">{category.count} 张</td>
      <td className="p-3 text-default-500">{creatorName(category)}</td>
      <td className="p-3 text-default-500">{formatDate(category.createdAt)}</td>
      <td className="p-3">
        <div className="flex justify-end gap-2">
          {confirmingDelete ? (
            <>
              <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setConfirmingDelete(false)} className="motion-press">
                取消
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isPending={pending}
                onPress={onDelete}
                className="motion-press border border-danger/30 text-danger hover:bg-danger/10"
              >
                确认删除
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onPress={() => onEdit(category)} className="motion-press">
                编辑
              </Button>
              <Button size="sm" variant="ghost" isPending={pending} onPress={() => setConfirmingDelete(true)} className="motion-press">
                删除
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function EmptySubcategory() {
  return <p className="p-6 text-sm text-default-400">当前角色暂无子分类。</p>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-default-200 bg-content1/70 p-3">
      <div className="text-xs text-default-400">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function creatorName(category: CategoryWithCount | CharacterWithCount) {
  return category.createdByLogin ? `@${category.createdByLogin}` : (category.createdByName ?? "-");
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("zh-CN");
}

