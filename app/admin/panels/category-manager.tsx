"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { addCategory } from "@/app/admin/actions";
import type { CategoryWithCount } from "@/lib/queries/categories";
import { CategoryDetail } from "./category-detail";
import type { SubmitHandler } from "./category-manager-types";
import { RoleList } from "./category-role-list";

interface Props {
  categories: readonly CategoryWithCount[];
}

export function CategoryManager({ categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "info" | "danger" } | null>(null);

  const topLevels = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const selected = topLevels.find((c) => c.id === selectedId) ?? topLevels[0] ?? null;
  const subcategories = selected ? categories.filter((c) => c.parentId === selected.id) : [];

  const submit: SubmitHandler = (action, fd, done) => {
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

  return (
    <div className="flex flex-col gap-4">
      <AddRoleForm pending={pending} onCreated={setSelectedId} onSubmit={submit} />
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <RoleList
          roles={topLevels}
          categories={categories}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
        <CategoryDetail
          selected={selected}
          subcategories={subcategories}
          pending={pending}
          onSubmit={submit}
        />
      </div>
      {message ? <Message text={message.text} tone={message.tone} /> : null}
    </div>
  );
}

function AddRoleForm({
  pending,
  onCreated,
  onSubmit,
}: {
  pending: boolean;
  onCreated: (id: string) => void;
  onSubmit: SubmitHandler;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const onAdd = () => {
    const fd = new FormData();
    fd.set("categoryId", id);
    fd.set("categoryName", name);
    fd.set("parentId", "");
    onSubmit(addCategory, fd, `已新增角色：${id}`);
    onCreated(id);
    setId("");
    setName("");
  };

  return (
    <section className="admin-panel p-3">
      <div className="mb-3">
        <h2 className="admin-section-title">新增角色</h2>
        <p className="admin-section-description mt-1">
          一级分类用于角色，子分类在右侧角色详情里新增。
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="id（slug）"
          className="field-control bg-default-50 px-3"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="显示名"
          className="field-control bg-default-50 px-3"
        />
        <Button variant="primary" isPending={pending} onPress={onAdd}>
          新增
        </Button>
      </div>
    </section>
  );
}

function Message({ text, tone }: { text: string; tone: "info" | "danger" }) {
  return (
    <p className={`text-xs ${tone === "danger" ? "text-danger" : "text-default-500"}`}>
      {text}
    </p>
  );
}
