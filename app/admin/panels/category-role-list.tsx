import { Button, Chip, Input } from "@/components/ui/heroui-compat";
import type { CategoryWithCount } from "@/lib/queries/categories";

interface RoleListProps {
  roles: readonly CategoryWithCount[];
  categories: readonly CategoryWithCount[];
  query: string;
  selectedId: string | null;
  totalRoles: number;
  onAddRole: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
}

export function RoleList({
  roles,
  categories,
  query,
  selectedId,
  totalRoles,
  onAddRole,
  onQueryChange,
  onSelect,
}: RoleListProps) {
  return (
    <aside className="admin-panel overflow-hidden">
      <RoleListHeader totalRoles={totalRoles} onAddRole={onAddRole} />
      <div className="border-b border-default-100 p-3">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索角色 / 分类 / ID"
          className="h-9 min-h-9"
        />
      </div>
      <RoleListBody roles={roles} categories={categories} query={query} selectedId={selectedId} onSelect={onSelect} />
    </aside>
  );
}

function RoleListHeader({
  totalRoles,
  onAddRole,
}: {
  totalRoles: number;
  onAddRole: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-default-100 p-3">
      <div>
        <h2 className="admin-section-title">角色树</h2>
        <p className="admin-section-description">{totalRoles} 个角色</p>
      </div>
      <Button size="sm" variant="primary" onPress={onAddRole} className="motion-press">
        新增
      </Button>
    </div>
  );
}

function RoleListBody({
  roles,
  categories,
  query,
  selectedId,
  onSelect,
}: {
  roles: readonly CategoryWithCount[];
  categories: readonly CategoryWithCount[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (roles.length === 0) return <RoleEmptyState query={query} />;
  return (
    <div className="grid max-h-[34rem] gap-1 overflow-auto p-2">
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
      className={`rounded-md border p-3 text-left transition ${
        selected
          ? "motion-selection border-primary/40 bg-primary/10 text-primary"
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

function RoleEmptyState({ query }: { query: string }) {
  const text = query.trim() ? "没有匹配的角色或分类。" : "还没有任何角色。";
  return <p className="p-6 text-center text-sm text-default-500">{text}</p>;
}

function countChildren(categories: readonly CategoryWithCount[], parentId: string) {
  return categories.filter((c) => c.parentId === parentId).length;
}

function sumCounts(categories: readonly CategoryWithCount[], parentId: string) {
  return categories
    .filter((c) => c.id === parentId || c.parentId === parentId)
    .reduce((sum, c) => sum + c.count, 0);
}
