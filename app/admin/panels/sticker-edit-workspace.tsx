"use client";

import Image from "next/image";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Autocomplete, Button, Chip, Input, ListBox, Select } from "@/components/ui/heroui-compat";
import type { AdminStickerRow, StickerStatus } from "@/lib/queries/admin-stickers";
import type { Category, Character } from "@/lib/types";
import type { StickerEditActions, StickerEditState } from "./sticker-edit-modal";

const STATUS_OPTIONS: readonly { value: StickerStatus; label: string }[] = [
  { value: "approved", label: "已发布" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "已拒绝" },
];

interface WorkspaceProps {
  actions: StickerEditActions;
  categories: readonly Category[];
  characters: readonly Character[];
  state: StickerEditState;
  sticker: AdminStickerRow;
}

export function StickerEditWorkspace({ actions, categories, characters, state, sticker }: WorkspaceProps) {
  const subCategories = useMemo(
    () => categories.filter((item) => item.characterId === state.character),
    [categories, state.character],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <StickerInspector categories={categories} sticker={sticker} />
      <StickerEditForm
        actions={actions}
        state={state}
        subCategories={subCategories}
        topLevels={characters}
      />
    </div>
  );
}

function StickerInspector({
  categories,
  sticker,
}: {
  categories: readonly Category[];
  sticker: AdminStickerRow;
}) {
  const category = categoryDisplay(categories, sticker.categoryId);
  return (
    <aside className="surface-panel h-fit p-3">
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-default-200 bg-default-100">
        <Image src={sticker.previewSrc} alt={sticker.name} fill sizes="272px" className="object-contain p-4" unoptimized />
      </div>
      <div className="mt-3 grid gap-2 text-xs">
        <MetaItem label="ID" value={sticker.id} mono />
        <MetaItem label="尺寸" value={`${sticker.width}×${sticker.height}`} />
        <MetaItem label="格式" value={sticker.ext.toUpperCase()} />
        <MetaItem label="分类" value={category} />
        <MetaItem label="投稿者" value={submitterName(sticker)} />
        <MetaItem label="提交时间" value={new Date(sticker.submittedAt).toLocaleString("zh-CN")} />
      </div>
    </aside>
  );
}

function StickerEditForm({
  actions,
  state,
  subCategories,
  topLevels,
}: {
  actions: StickerEditActions;
  state: StickerEditState;
  subCategories: readonly Category[];
  topLevels: readonly Character[];
}) {
  return (
    <div className="grid gap-3">
      <FormSection title="基础信息">
        <Field label="名字">
          <Input value={state.name} onChange={(event) => actions.setName(event.target.value)} />
        </Field>
      </FormSection>
      <FormSection title="归属分类">
        <CategoryFields actions={actions} state={state} subCategories={subCategories} topLevels={topLevels} />
      </FormSection>
      <FormSection title="发布状态">
        <StatusSelect value={state.status} onChange={actions.setStatus} />
      </FormSection>
      <FormSection title="标签">
        <TagEditor tags={state.tags} onChange={actions.setTags} />
      </FormSection>
      {state.error ? <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
    </div>
  );
}

function CategoryFields({
  actions,
  state,
  subCategories,
  topLevels,
}: {
  actions: StickerEditActions;
  state: StickerEditState;
  subCategories: readonly Category[];
  topLevels: readonly Character[];
}) {
  const subCategoryOptions = [
    { value: "__placeholder", label: subCategories.length === 0 ? "（无子分类）" : "请选择" },
    ...subCategories.map((item) => ({ value: item.id, label: `${item.name} (${item.slug})` })),
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="角色">
        <OptionAutocomplete
          options={topLevels.map((item) => ({ value: item.id, label: item.name }))}
          value={state.character}
          onChange={(value) => {
            actions.setCharacter(value);
            actions.setSubCategory("");
          }}
        />
      </Field>
      <Field label="子分类">
        <OptionAutocomplete
          options={subCategoryOptions}
          value={state.subCategory || "__placeholder"}
          onChange={(value) => actions.setSubCategory(value === "__placeholder" ? "" : value)}
        />
      </Field>
    </div>
  );
}

function TagEditor({ onChange, tags }: { onChange: (tags: readonly string[]) => void; tags: readonly string[] }) {
  const [draft, setDraft] = useState("");
  const addDraft = () => {
    const nextTags = normalizeTagDraft(draft);
    if (nextTags.length === 0) return;
    onChange(uniqueTags([...tags, ...nextTags]));
    setDraft("");
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addDraft();
  };

  return (
    <div className="grid gap-2">
      <div className="flex min-h-10 flex-wrap items-center gap-1 rounded-md border border-default-200 bg-content1 p-2">
        {tags.length === 0 ? <span className="px-1 text-xs text-default-400">暂无标签</span> : null}
        {tags.map((tag) => (
          <Chip key={tag} size="sm" variant="soft">
            <Chip.Label>#{tag}</Chip.Label>
            <button
              type="button"
              aria-label={`删除标签 ${tag}`}
              className="ml-1 rounded px-0.5 text-default-500 hover:text-default-800"
              onClick={() => onChange(tags.filter((item) => item !== tag))}
            >
              ×
            </button>
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入标签后按 Enter"
        />
        <Button variant="ghost" onPress={addDraft} className="motion-press">
          添加
        </Button>
      </div>
    </div>
  );
}

function OptionAutocomplete({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredOptions = filterOptions(options, query);
  return (
    <Autocomplete selectedKey={value} onSelectionChange={(key) => onChange(String(key ?? ""))}>
      <Autocomplete.Trigger aria-label="选择" className="field-trigger modal-field bg-content1">
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="motion-popover popover-surface max-h-64 overflow-auto p-2">
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索..." />
        <ListBox className="mt-2 max-h-48 overflow-auto">
          {filteredOptions.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label} className="listbox-option">
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

function StatusSelect({ onChange, value }: { onChange: (value: StickerStatus) => void; value: StickerStatus }) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key) as StickerStatus)}>
      <Select.Trigger aria-label="状态" className="field-trigger modal-field bg-content1">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface max-h-56 overflow-auto">
        <ListBox>
          {STATUS_OPTIONS.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label} className="listbox-option">
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="surface-panel grid gap-3 p-3">
      <h3 className="admin-section-title">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}

function MetaItem({ label, mono = false, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-default-400">{label}</span>
      <span className={mono ? "break-all font-mono text-default-600" : "break-words text-default-600"}>{value}</span>
    </div>
  );
}

function filterOptions(options: readonly { value: string; label: string }[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return options;
  return options.filter((option) => option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text));
}

function normalizeTagDraft(draft: string) {
  return draft.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function uniqueTags(tags: readonly string[]) {
  return [...new Set(tags)];
}

function categoryDisplay(categories: readonly Category[], categoryId: string) {
  const category = categories.find((item) => item.id === categoryId);
  return category ? `${category.name} (${category.slug})` : categoryId;
}

function submitterName(sticker: AdminStickerRow) {
  return sticker.submitterLogin ? `@${sticker.submitterLogin}` : (sticker.submitterName ?? "—");
}
