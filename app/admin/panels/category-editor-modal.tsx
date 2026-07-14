"use client";

import { useState, type ReactNode } from "react";
import { Shuffle } from "lucide-react";
import { addCategory, addCharacter, updateCategory, updateCharacter } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import { Button, Input, ListBox, Modal, Select } from "@/components/ui/heroui-compat";
import { categoryIdFor, randomCategorySlug } from "@/lib/category-ids";
import type { CategoryWithCount, CharacterWithCount } from "@/lib/queries/categories";
import { nextSortOrder } from "@/lib/sort-order";
import type { CharacterVisibility } from "@/lib/types";
import { CharacterBackgroundUpload } from "./character-background-upload";
import type { CategoryDraft, SubmitHandler } from "./category-manager-types";

const VISIBILITY_LABELS: Readonly<Record<CharacterVisibility, string>> = {
  public: "正常显示",
  hidden: "隐藏（所有人不可见）",
  admin_only: "隐藏（仅管理员可见）",
};

interface EditorValues {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: string;
  readonly visibility: CharacterVisibility;
  readonly backgroundImageUrl: string;
}

interface EditorProps {
  readonly categories: readonly CategoryWithCount[];
  readonly characters: readonly CharacterWithCount[];
  readonly draft: CategoryDraft;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onCreated: (id: string) => void;
  readonly onSubmit: SubmitHandler;
}

export function CategoryEditorModal(props: EditorProps) {
  const [values, setValues] = useState(() => initialValues(props));
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const feedback = useFeedback();
  const patchValues = (patch: Partial<EditorValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  };
  const save = () => saveDraft(props, values);

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && props.onClose()}>
        <Modal.Container>
          <EditorDialog
            {...props}
            feedback={feedback}
            onChange={patchValues}
            onSave={save}
            setUploadingBackground={setUploadingBackground}
            uploadingBackground={uploadingBackground}
            values={values}
          />
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface DialogProps extends EditorProps {
  readonly feedback: ReturnType<typeof useFeedback>;
  readonly onChange: (patch: Partial<EditorValues>) => void;
  readonly onSave: () => void;
  readonly setUploadingBackground: (uploading: boolean) => void;
  readonly uploadingBackground: boolean;
  readonly values: EditorValues;
}

function EditorDialog(props: DialogProps) {
  return (
    <Modal.Dialog className="motion-panel modal-surface w-full max-w-md">
      <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
        <span aria-hidden="true">×</span>
      </Modal.CloseTrigger>
      <Modal.Header><Modal.Heading>{draftTitle(props.draft)}</Modal.Heading></Modal.Header>
      <Modal.Body><EditorFields {...props} /></Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onPress={props.onClose} className="motion-press">取消</Button>
        <Button variant="primary" isPending={props.pending} onPress={props.onSave} className="motion-press">
          保存
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

function EditorFields(props: DialogProps) {
  const isCharacter = props.draft.mode.includes("character");
  return (
    <div className="grid gap-3">
      <IdentityField draft={props.draft} onChange={props.onChange} values={props.values} />
      {props.draft.mode.includes("category") ? (
        <Field label="分类 ID">
          <Input value={categoryPreviewId(props.draft, props.values.id)} readOnly className="field-control px-3 font-mono text-xs" />
        </Field>
      ) : null}
      <Field label="显示名">
        <Input value={props.values.name} onChange={(event) => props.onChange({ name: event.target.value })} className="field-control px-3" />
      </Field>
      <Field label="排序（越小越靠前）">
        <Input value={props.values.sortOrder} onChange={(event) => props.onChange({ sortOrder: event.target.value })} type="number" step={1} className="field-control px-3" />
      </Field>
      {isCharacter ? <CharacterFields {...props} /> : null}
    </div>
  );
}

function IdentityField({ draft, onChange, values }: Pick<DialogProps, "draft" | "onChange" | "values">) {
  const isCharacter = draft.mode.includes("character");
  return (
    <Field label={isCharacter ? "角色 ID" : "分类短名（slug）"}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={values.id}
          onChange={(event) => onChange({ id: event.target.value })}
          placeholder={isCharacter ? "角色 ID" : "分类短名"}
          disabled={draft.mode === "edit-character"}
          className="field-control px-3"
        />
        {draft.mode === "add-category" ? (
          <Button type="button" variant="soft" onPress={() => onChange({ id: randomCategorySlug() })} className="motion-press">
            <Shuffle className="h-4 w-4" aria-hidden="true" />随机
          </Button>
        ) : null}
      </div>
    </Field>
  );
}

function CharacterFields(props: DialogProps) {
  return (
    <>
      <Field label="显示"><VisibilitySelect value={props.values.visibility} onChange={(visibility) => props.onChange({ visibility })} /></Field>
      <Field label="首页背景图 URL">
        <Input value={props.values.backgroundImageUrl} onChange={(event) => props.onChange({ backgroundImageUrl: event.target.value })} placeholder="https://..." className="field-control px-3" />
      </Field>
      <CharacterBackgroundUpload
        characterId={props.values.id}
        isUploading={props.uploadingBackground}
        onUploaded={(backgroundImageUrl) => props.onChange({ backgroundImageUrl })}
        setUploading={props.setUploadingBackground}
        feedback={props.feedback}
      />
    </>
  );
}

function VisibilitySelect({ onChange, value }: { readonly onChange: (value: CharacterVisibility) => void; readonly value: CharacterVisibility }) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key) as CharacterVisibility)}>
      <Select.Trigger aria-label="角色显示状态" className="field-trigger modal-field bg-content1">
        <Select.Value>{VISIBILITY_LABELS[value]}</Select.Value><Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface max-h-56 overflow-auto">
        <ListBox>
          <ListBox.Item id="public" className="listbox-option">正常显示</ListBox.Item>
          <ListBox.Item id="hidden" className="listbox-option">隐藏（所有人不可见）</ListBox.Item>
          <ListBox.Item id="admin_only" className="listbox-option">隐藏（仅管理员可见）</ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function initialValues({ categories, characters, draft }: EditorProps): EditorValues {
  return {
    id: initialId(draft),
    name: draft.character?.name ?? draft.category?.name ?? "",
    sortOrder: initialSortOrder(draft, characters, categories),
    visibility: draft.character?.visibility ?? "public",
    backgroundImageUrl: draft.character?.backgroundImageUrl ?? "",
  };
}

function initialId(draft: CategoryDraft) {
  if (draft.mode === "edit-character") return draft.character.id;
  if (draft.mode === "edit-category") return draft.category.slug;
  return "";
}

function initialSortOrder(draft: CategoryDraft, characters: readonly CharacterWithCount[], categories: readonly CategoryWithCount[]) {
  if (draft.mode === "edit-character") return String(draft.character.sortOrder);
  if (draft.mode === "edit-category") return String(draft.category.sortOrder);
  if (draft.mode === "add-category") {
    return String(nextSortOrder(categories.filter((item) => item.characterId === draft.character.id)));
  }
  return String(nextSortOrder(characters));
}

function categoryPreviewId(draft: CategoryDraft, slug: string): string {
  if (draft.mode === "edit-category") return draft.category.id;
  if (draft.mode === "add-category" && slug.trim()) return categoryIdFor(draft.character.id, slug.trim());
  return "";
}

function saveDraft(props: EditorProps, values: EditorValues) {
  const fd = new FormData();
  if (props.draft.mode.includes("character")) saveCharacter(props, values, fd);
  else saveCategory(props, values, fd);
}

function saveCharacter(props: EditorProps, values: EditorValues, fd: FormData) {
  fd.set("characterId", values.id);
  fd.set("characterName", values.name);
  fd.set("characterSortOrder", values.sortOrder);
  fd.set("characterVisibility", values.visibility);
  fd.set("characterBackgroundImageUrl", values.backgroundImageUrl);
  const action = props.draft.mode === "edit-character" ? updateCharacter : addCharacter;
  props.onSubmit(action, fd, `${draftTitle(props.draft)}：${values.id}`);
  if (props.draft.mode === "add-character") props.onCreated(values.id);
}

function saveCategory(props: EditorProps, values: EditorValues, fd: FormData) {
  fd.set("categoryId", props.draft.category?.id ?? values.id);
  fd.set("categorySlug", values.id);
  fd.set("categoryName", values.name);
  fd.set("categorySortOrder", values.sortOrder);
  fd.set("characterId", props.draft.character?.id ?? props.draft.category?.characterId ?? "");
  const action = props.draft.mode === "edit-category" ? updateCategory : addCategory;
  props.onSubmit(action, fd, `${draftTitle(props.draft)}：${values.id}`);
}

function draftTitle(draft: CategoryDraft) {
  if (draft.mode === "add-character") return "新增角色";
  if (draft.mode === "add-category") return "新增分类";
  return draft.mode === "edit-category" ? "编辑分类" : "编辑角色";
}

function Field({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return <div className="grid gap-1"><label className="text-xs text-default-500">{label}</label>{children}</div>;
}
