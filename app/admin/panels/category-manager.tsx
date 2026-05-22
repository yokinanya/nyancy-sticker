"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Input } from "@heroui/react";
import { CategorySelect } from "@/app/admin/category-select";
import {
  addCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/actions";
import type { CategoryWithCount } from "@/lib/queries/categories";

interface Props {
  categories: readonly CategoryWithCount[];
}

export function CategoryManager({ categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; tone: "info" | "danger" } | null>(null);

  const submit = (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => {
    startTransition(async () => {
      try {
        await action(fd);
        setMessage({ text: done, tone: "info" });
        router.refresh();
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : "操作失败。", tone: "danger" });
      }
    });
  };

  const topLevels = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const topLevelsAsRef = topLevels.map((c) => ({ id: c.id, name: c.name }));

  // 按角色分组，找出每个一级下挂的二级
  const groups = useMemo(() => {
    return topLevels.map((top) => ({
      top,
      children: categories.filter((c) => c.parentId === top.id),
    }));
  }, [topLevels, categories]);

  // 孤立二级（指向的 parent 不存在，理论上 schema 不允许，但兜底）
  const orphans = useMemo(
    () =>
      categories.filter(
        (c) => c.parentId && !topLevels.some((t) => t.id === c.parentId),
      ),
    [categories, topLevels],
  );

  return (
    <div className="flex flex-col gap-4">
      <AddForm topLevels={topLevelsAsRef} pending={pending} onSubmit={submit} />
      <div className="flex flex-col gap-3">
        {groups.length === 0 ? (
          <p className="rounded-lg border border-default-200 bg-content1 p-6 text-center text-sm text-default-500">
            还没有任何角色。在上方先新建一个角色。
          </p>
        ) : null}
        {groups.map(({ top, children }) => (
          <GroupCard
            key={top.id}
            top={top}
            children={children}
            pending={pending}
            onSubmit={submit}
          />
        ))}
        {orphans.length > 0 ? (
          <div className="rounded-lg border border-default-200 bg-content1">
            <div className="border-b border-default-200 p-3 text-sm font-medium text-warning">
              悬空分类（父级不存在）
            </div>
            <ul className="divide-y divide-default-100">
              {orphans.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  pending={pending}
                  onSubmit={submit}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {message ? (
        <p className={`text-xs ${message.tone === "danger" ? "text-danger" : "text-default-500"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function GroupCard({
  top,
  children,
  pending,
  onSubmit,
}: {
  top: CategoryWithCount;
  children: readonly CategoryWithCount[];
  pending: boolean;
  onSubmit: (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="rounded-lg border border-default-200 bg-content1">
      <div className="flex items-center justify-between gap-2 border-b border-default-200 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{top.name}</span>
          <span className="font-mono text-xs text-default-400">{top.id}</span>
          <Chip size="sm" variant="soft">
            <Chip.Label>{children.length} 个子分类</Chip.Label>
          </Chip>
          <span className="text-[11px] text-default-400">
            创建者：
            {top.createdByLogin ? `@${top.createdByLogin}` : (top.createdByName ?? "—")} ·
            {" "}
            {new Date(top.createdAt).toLocaleDateString("zh-CN")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "展开" : "收起"}
          </Button>
        </div>
      </div>
      <TopLevelEditRow top={top} pending={pending} onSubmit={onSubmit} />
      {!collapsed ? (
        <ul className="divide-y divide-default-100 border-t border-default-100">
          {children.length === 0 ? (
            <li className="p-3 text-xs text-default-400">暂无子分类。</li>
          ) : (
            children.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                pending={pending}
                onSubmit={onSubmit}
              />
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function TopLevelEditRow({
  top,
  pending,
  onSubmit,
}: {
  top: CategoryWithCount;
  pending: boolean;
  onSubmit: (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => void;
}) {
  const [name, setName] = useState(top.name);
  const ref = useRef(top.name);
  ref.current = top.name;

  const onSave = () => {
    const fd = new FormData();
    fd.set("categoryId", top.id);
    fd.set("categoryName", name);
    fd.set("parentId", ""); // 保持一级
    onSubmit(updateCategory, fd, `已更新角色：${top.id}`);
  };

  const onDelete = () => {
    if (!window.confirm(`确认删除角色「${top.name}」？只能删除没有子分类的角色。`)) return;
    const fd = new FormData();
    fd.set("categoryId", top.id);
    onSubmit(deleteCategory, fd, `已删除：${top.id}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <span className="text-xs text-default-500">改角色显示名：</span>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-default-50 px-3"
      />
      <Button size="sm" variant="ghost" isPending={pending} isDisabled={name === ref.current} onPress={onSave}>
        保存
      </Button>
      <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete}>
        删除角色
      </Button>
    </div>
  );
}

function AddForm({
  topLevels,
  pending,
  onSubmit,
}: {
  topLevels: readonly { id: string; name: string }[];
  pending: boolean;
  onSubmit: (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => void;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const onAdd = () => {
    const fd = new FormData();
    fd.set("categoryId", id);
    fd.set("categoryName", name);
    fd.set("parentId", parentId);
    onSubmit(
      addCategory,
      fd,
      `已新增${parentId ? "子分类" : "角色"}：${id}`,
    );
    setId("");
    setName("");
    setParentId("");
  };

  return (
    <div className="rounded-lg border border-default-200 bg-content1 p-3">
      <div className="mb-2 text-sm font-medium">新增分类</div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="id（slug）"
          className="bg-default-50 px-3"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="显示名"
          className="bg-default-50 px-3"
        />
        <CategorySelect
          categories={[{ id: "", name: "（新增角色）" }, ...topLevels]}
          value={parentId}
          onChange={setParentId}
        />
        <Button variant="primary" isPending={pending} onPress={onAdd}>
          新增
        </Button>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  pending,
  onSubmit,
}: {
  category: CategoryWithCount;
  pending: boolean;
  onSubmit: (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => void;
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
    <li className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
      <div className="flex-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-default-50 px-3"
        />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-default-400">
          <span className="font-mono">{category.id}</span>
          <span>·</span>
          <span>{category.count} 张</span>
          <span>·</span>
          <span>
            {category.createdByLogin
              ? `@${category.createdByLogin}`
              : (category.createdByName ?? "—")}
          </span>
          <span>·</span>
          <span>{new Date(category.createdAt).toLocaleDateString("zh-CN")}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" isPending={pending} onPress={onSave}>
          保存
        </Button>
        <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete}>
          删除
        </Button>
      </div>
    </li>
  );
}
