"use client";

import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Input, ListBox, Modal, Select } from "@/components/ui/heroui-compat";
import {
  addCategory,
  addCharacter,
  updateCategory,
  updateCharacter,
} from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import { categoryIdFor, randomCategorySlug } from "@/lib/category-ids";
import type { CategoryWithCount, CharacterWithCount } from "@/lib/queries/categories";
import type { CharacterVisibility } from "@/lib/types";
import { CharacterBackgroundUpload } from "./character-background-upload";
import { CategoryDetail } from "./category-detail";
import type { SubmitHandler } from "./category-manager-types";
import { RoleList } from "./category-role-list";

interface Props {
  categories: readonly CategoryWithCount[];
  characters: readonly CharacterWithCount[];
  canAddRole: boolean;
}

type Draft =
  | { mode: "add-character"; character: null; category: null }
  | { mode: "edit-character"; character: CharacterWithCount; category: null }
  | { mode: "add-category"; character: CharacterWithCount; category: null }
  | { mode: "edit-category"; character: null; category: CategoryWithCount };

export function CategoryManager({ canAddRole, categories, characters }: Props) {
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
          canAddRole={canAddRole}
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
  const [visibility, setVisibility] = useState(initialVisibility(draft));
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initialBackgroundImageUrl(draft));
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const feedback = useFeedback();
  const title = getDraftTitle(draft);

  const save = () => {
    const fd = new FormData();
    if (draft.mode.includes("character")) {
      saveCharacter(draft, fd, id, name, visibility, backgroundImageUrl, onSubmit, onCreated);
    }
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
                <Field label={draft.mode.includes("character") ? "角色 ID" : "分类短名（slug）"}>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder={draft.mode.includes("character") ? "角色 ID" : "分类短名"}
                      disabled={draft.mode.startsWith("edit-character")}
                      className="field-control px-3"
                    />
                    {draft.mode === "add-category" ? (
                      <Button
                        type="button"
                        variant="soft"
                        onPress={() => setId(randomCategorySlug())}
                        className="motion-press"
                      >
                        <Shuffle className="h-4 w-4" aria-hidden="true" />
                        随机
                      </Button>
                    ) : null}
                  </div>
                </Field>
                {draft.mode.includes("category") ? (
                  <Field label="分类 ID">
                    <Input
                      value={categoryPreviewId(draft, id)}
                      readOnly
                      className="field-control px-3 font-mono text-xs"
                    />
                  </Field>
                ) : null}
                <Field label="显示名">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="显示名"
                    className="field-control px-3"
                  />
                </Field>
                {draft.mode.includes("character") ? (
                  <>
                    <Field label="显示">
                      <VisibilitySelect value={visibility} onChange={setVisibility} />
                    </Field>
                    <Field label="首页背景图 URL">
                      <Input
                        value={backgroundImageUrl}
                        onChange={(e) => setBackgroundImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="field-control px-3"
                      />
                    </Field>
                    <CharacterBackgroundUpload
                      characterId={id}
                      isUploading={uploadingBackground}
                      onUploaded={setBackgroundImageUrl}
                      setUploading={setUploadingBackground}
                      feedback={feedback}
                    />
                  </>
                ) : null}
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

function categoryPreviewId(draft: Draft, slug: string): string {
  if (draft.mode === "edit-category") return draft.category.id;
  if (draft.mode === "add-category" && slug.trim()) return categoryIdFor(draft.character.id, slug.trim());
  return "";
}

function initialName(draft: Draft) {
  return draft.character?.name ?? draft.category?.name ?? "";
}

function initialVisibility(draft: Draft): CharacterVisibility {
  return draft.character?.visibility ?? "public";
}

function initialBackgroundImageUrl(draft: Draft) {
  return draft.character?.backgroundImageUrl ?? "";
}

function saveCharacter(
  draft: Draft,
  fd: FormData,
  id: string,
  name: string,
  visibility: CharacterVisibility,
  backgroundImageUrl: string,
  onSubmit: SubmitHandler,
  onCreated: (id: string) => void,
) {
  fd.set("characterId", id);
  fd.set("characterName", name);
  fd.set("characterVisibility", visibility);
  fd.set("characterBackgroundImageUrl", backgroundImageUrl);
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

function VisibilitySelect({
  onChange,
  value,
}: {
  onChange: (value: CharacterVisibility) => void;
  value: CharacterVisibility;
}) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key) as CharacterVisibility)}>
      <Select.Trigger aria-label="角色显示状态" className="field-trigger modal-field bg-content1">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface max-h-56 overflow-auto">
        <ListBox>
          <ListBox.Item id="public" textValue="正常显示" className="listbox-option">
            正常显示
          </ListBox.Item>
          <ListBox.Item id="hidden" textValue="隐藏（所有人不可见）" className="listbox-option">
            隐藏（所有人不可见）
          </ListBox.Item>
          <ListBox.Item id="admin_only" textValue="隐藏（仅管理员可见）" className="listbox-option">
            隐藏（仅管理员可见）
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
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

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}
