"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal } from "@/components/ui/heroui-compat";
import { addCategory, updateCategory } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { CategoryWithCount } from "@/lib/queries/categories";
import { CategoryDetail } from "./category-detail";
import type { SubmitHandler } from "./category-manager-types";
import { RoleList } from "./category-role-list";

interface Props {
  categories: readonly CategoryWithCount[];
}

type Draft = {
  mode: "add-role" | "add-subcategory" | "edit";
  parent: CategoryWithCount | null;
  target: CategoryWithCount | null;
};

export function CategoryManager({ categories }: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");

  const topLevels = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const visibleRoles = useMemo(() => filterRoles(categories, topLevels, query), [categories, query, topLevels]);
  const selected =
    topLevels.find((c) => c.id === selectedId) ?? visibleRoles[0] ?? topLevels[0] ?? null;
  const subcategories = selected ? categories.filter((c) => c.parentId === selected.id) : [];

  const submit: SubmitHandler = (action, fd, done) => {
    startTransition(async () => {
      try {
        await action(fd);
        setDraft(null);
        feedback.success(done);
        router.refresh();
      } catch (e) {
        feedback.error(e instanceof Error ? e.message : "操作失败。");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <RoleList
          roles={visibleRoles}
          categories={categories}
          query={query}
          selectedId={selected?.id ?? null}
          onAddRole={() => setDraft({ mode: "add-role", parent: null, target: null })}
          onQueryChange={setQuery}
          onSelect={setSelectedId}
          totalRoles={topLevels.length}
        />
        <CategoryDetail
          selected={selected}
          subcategories={subcategories}
          pending={pending}
          onAddSubcategory={() =>
            selected && setDraft({ mode: "add-subcategory", parent: selected, target: null })
          }
          onEdit={(target) => setDraft({ mode: "edit", parent: null, target })}
          onSubmit={submit}
        />
      </div>
      {draft ? (
        <CategoryEditorModal
          draft={draft}
          pending={pending}
          onClose={() => setDraft(null)}
          onCreated={setSelectedId}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
}

function CategoryEditorModal({
  draft,
  pending,
  onClose,
  onCreated,
  onSubmit,
}: {
  draft: Draft;
  pending: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  onSubmit: SubmitHandler;
}) {
  const target = draft.target;
  const [id, setId] = useState(target?.id ?? "");
  const [name, setName] = useState(target?.name ?? "");
  const title = getDraftTitle(draft);

  const save = () => {
    const fd = new FormData();
    fd.set("categoryId", id);
    fd.set("categoryName", name);
    fd.set("parentId", draft.parent?.id ?? target?.parentId ?? "");
    onSubmit(target ? updateCategory : addCategory, fd, `${title}：${id}`);
    if (!target && draft.mode === "add-role") onCreated(id);
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-md">
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">
                ×
              </span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="grid gap-3">
                <Field label="ID">
                  <Input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="id（slug）"
                    disabled={Boolean(target)}
                    className="field-control px-3"
                  />
                </Field>
                <Field label="显示名">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="显示名"
                    className="field-control px-3"
                  />
                </Field>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose} className="motion-press">
                取消
              </Button>
              <Button variant="primary" isPending={pending} onPress={save} className="motion-press">
                保存
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function getDraftTitle(draft: Draft) {
  if (draft.mode === "add-role") return "新增角色";
  if (draft.mode === "add-subcategory") return "新增分类";
  return draft.target?.parentId ? "编辑分类" : "编辑角色";
}

function filterRoles(
  categories: readonly CategoryWithCount[],
  roles: readonly CategoryWithCount[],
  query: string,
) {
  const text = query.trim().toLowerCase();
  if (!text) return roles;
  const matchedRoleIds = new Set<string>();
  categories.forEach((category) => {
    if (!matchesCategory(category, text)) return;
    matchedRoleIds.add(category.parentId ?? category.id);
  });
  return roles.filter((role) => matchedRoleIds.has(role.id));
}

function matchesCategory(category: CategoryWithCount, text: string) {
  return category.name.toLowerCase().includes(text) || category.id.toLowerCase().includes(text);
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}
