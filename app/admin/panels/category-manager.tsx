"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal } from "@/components/ui/heroui-compat";
import { addCategory, addCharacter, updateCategory, updateCharacter } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { CategoryWithCount, CharacterWithCount } from "@/lib/queries/categories";
import { CategoryDetail } from "./category-detail";
import type { SubmitHandler } from "./category-manager-types";
import { RoleList } from "./category-role-list";

interface Props {
  categories: readonly CategoryWithCount[];
  characters: readonly CharacterWithCount[];
}

type Draft =
  | { mode: "add-character"; character: null; category: null }
  | { mode: "edit-character"; character: CharacterWithCount; category: null }
  | { mode: "add-category"; character: CharacterWithCount; category: null }
  | { mode: "edit-category"; character: null; category: CategoryWithCount };

export function CategoryManager({ categories, characters }: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const visibleRoles = useMemo(() => filterRoles(categories, characters, query), [categories, characters, query]);
  const selected = characters.find((c) => c.id === selectedId) ?? visibleRoles[0] ?? characters[0] ?? null;
  const subcategories = selected ? categories.filter((c) => c.characterId === selected.id) : [];

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
          onAddRole={() => setDraft({ mode: "add-character", character: null, category: null })}
          onQueryChange={setQuery}
          onSelect={setSelectedId}
          totalRoles={characters.length}
        />
        <CategoryDetail
          selected={selected}
          subcategories={subcategories}
          pending={pending}
          onAddSubcategory={() =>
            selected && setDraft({ mode: "add-category", character: selected, category: null })
          }
          onEditCategory={(category) => setDraft({ mode: "edit-category", character: null, category })}
          onEditCharacter={(character) => setDraft({ mode: "edit-character", character, category: null })}
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
  const [id, setId] = useState(initialId(draft));
  const [name, setName] = useState(initialName(draft));
  const title = getDraftTitle(draft);

  const save = () => {
    const fd = new FormData();
    if (draft.mode.includes("character")) saveCharacter(draft, fd, id, name, onSubmit, onCreated);
    else saveCategory(draft, fd, id, name, onSubmit);
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-md">
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">×</span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="grid gap-3">
                <Field label={draft.mode.includes("character") ? "角色 ID" : "分类 ID（slug）"}>
                  <Input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="id（slug）"
                    disabled={draft.mode.startsWith("edit-character")}
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

function initialId(draft: Draft) {
  if (draft.mode === "edit-character") return draft.character.id;
  if (draft.mode === "edit-category") return draft.category.slug;
  return "";
}

function initialName(draft: Draft) {
  return draft.character?.name ?? draft.category?.name ?? "";
}

function saveCharacter(
  draft: Draft,
  fd: FormData,
  id: string,
  name: string,
  onSubmit: SubmitHandler,
  onCreated: (id: string) => void,
) {
  fd.set("characterId", id);
  fd.set("characterName", name);
  onSubmit(draft.mode === "edit-character" ? updateCharacter : addCharacter, fd, `${getDraftTitle(draft)}：${id}`);
  if (draft.mode === "add-character") onCreated(id);
}

function saveCategory(draft: Draft, fd: FormData, slug: string, name: string, onSubmit: SubmitHandler) {
  const categoryId = draft.category?.id ?? "";
  const characterId = draft.character?.id ?? draft.category?.characterId ?? "";
  fd.set("categoryId", categoryId || slug);
  fd.set("categorySlug", slug);
  fd.set("categoryName", name);
  fd.set("characterId", characterId);
  onSubmit(draft.mode === "edit-category" ? updateCategory : addCategory, fd, `${getDraftTitle(draft)}：${slug}`);
}

function getDraftTitle(draft: Draft) {
  if (draft.mode === "add-character") return "新增角色";
  if (draft.mode === "add-category") return "新增分类";
  return draft.mode === "edit-category" ? "编辑分类" : "编辑角色";
}

function filterRoles(
  categories: readonly CategoryWithCount[],
  roles: readonly CharacterWithCount[],
  query: string,
) {
  const text = query.trim().toLowerCase();
  if (!text) return roles;
  const matchedRoleIds = new Set<string>();
  categories.forEach((category) => {
    if (matchesCategory(category, text)) matchedRoleIds.add(category.characterId);
  });
  roles.forEach((role) => {
    if (matchesRole(role, text)) matchedRoleIds.add(role.id);
  });
  return roles.filter((role) => matchedRoleIds.has(role.id));
}

function matchesRole(role: CharacterWithCount, text: string) {
  return role.name.toLowerCase().includes(text) || role.id.toLowerCase().includes(text);
}

function matchesCategory(category: CategoryWithCount, text: string) {
  return (
    category.name.toLowerCase().includes(text) ||
    category.slug.toLowerCase().includes(text) ||
    category.id.toLowerCase().includes(text)
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}
