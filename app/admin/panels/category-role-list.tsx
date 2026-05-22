import { Chip } from "@heroui/react";
import type { CategoryWithCount } from "@/lib/queries/categories";

interface RoleListProps {
  roles: readonly CategoryWithCount[];
  categories: readonly CategoryWithCount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RoleList({
  roles,
  categories,
  selectedId,
  onSelect,
}: RoleListProps) {
  if (roles.length === 0) {
    return <p className="admin-panel p-6 text-center text-sm text-default-500">还没有任何角色。</p>;
  }

  return (
    <aside className="admin-panel overflow-hidden">
      <div className="border-b border-default-100 p-3">
        <h2 className="admin-section-title">角色</h2>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {roles.map((role) => (
          <RoleButton
            key={role.id}
            role={role}
            childCount={countChildren(categories, role.id)}
            totalCount={sumCounts(categories, role.id)}
            selected={role.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}

function RoleButton({
  role,
  childCount,
  totalCount,
  selected,
  onSelect,
}: {
  role: CategoryWithCount;
  childCount: number;
  totalCount: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role.id)}
      className={`rounded-lg border p-3 text-left transition ${
        selected
          ? "border-primary bg-primary/10"
          : "border-transparent hover:border-default-200 hover:bg-default-50 dark:hover:bg-default-100/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{role.name}</span>
        <Chip size="sm" variant={selected ? "primary" : "soft"}>
          <Chip.Label>{childCount}</Chip.Label>
        </Chip>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-default-400">
        <span className="font-mono">{role.id}</span>
        <span>{totalCount} 张</span>
      </div>
    </button>
  );
}

function countChildren(categories: readonly CategoryWithCount[], parentId: string) {
  return categories.filter((c) => c.parentId === parentId).length;
}

function sumCounts(categories: readonly CategoryWithCount[], parentId: string) {
  return categories
    .filter((c) => c.id === parentId || c.parentId === parentId)
    .reduce((sum, c) => sum + c.count, 0);
}
