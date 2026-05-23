"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Autocomplete, Button, Input, ListBox, Modal, Select } from "@heroui/react";
import { updateSticker } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { AdminStickerRow, StickerStatus } from "@/lib/queries/admin-stickers";
import type { Category } from "@/lib/types";

const STATUS_OPTIONS: readonly { value: StickerStatus; label: string }[] = [
  { value: "approved", label: "已发布" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "已拒绝" },
];

interface StickerEditModalProps {
  sticker: AdminStickerRow;
  categories: readonly Category[];
  onClose: () => void;
  onSaved: () => void;
}

export function StickerEditModal({
  sticker,
  categories,
  onClose,
  onSaved,
}: StickerEditModalProps) {
  const [pending, startTransition] = useTransition();
  const feedback = useFeedback();
  const initialCat = categories.find((c) => c.id === sticker.categoryId);
  const initialCharacter = initialCat?.parentId ?? sticker.categoryId;
  const initialSub = initialCat?.parentId ? sticker.categoryId : "";

  const [name, setName] = useState(sticker.name);
  const [character, setCharacter] = useState(initialCharacter);
  const [subCategory, setSubCategory] = useState(initialSub);
  const [tags, setTags] = useState(sticker.tags.join(", "));
  const [status, setStatus] = useState<StickerStatus>(sticker.status);
  const [error, setError] = useState<string | null>(null);

  const topLevels = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => c.parentId === character);

  const save = () => {
    setError(null);
    if (!subCategory) {
      setError("请选择子分类。");
      return;
    }
    const fd = new FormData();
    fd.set("id", sticker.id);
    fd.set("editName", name);
    fd.set("editCategory", subCategory);
    fd.set("editTags", tags);
    fd.set("editStatus", status);
    startTransition(async () => {
      try {
        await updateSticker(fd);
        feedback.success(`已保存：${name}`);
        onSaved();
      } catch (e) {
        const message = e instanceof Error ? e.message : "保存失败。";
        setError(message);
        feedback.error(message);
      }
    });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
        <Modal.Container>
          <Modal.Dialog className={`motion-panel modal-surface w-full max-w-md ${error ? "motion-shake" : ""}`}>
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">
                ×
              </span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>编辑贴纸</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-4 sm:px-6">
              <StickerEditFields
                state={{
                  sticker,
                  name,
                  character,
                  subCategory,
                  tags,
                  status,
                  error,
                  topLevels,
                  subCategories,
                }}
                actions={{
                  setName,
                  setCharacter,
                  setSubCategory,
                  setTags,
                  setStatus,
                }}
              />
            </Modal.Body>
            <Modal.Footer>
              <div className="flex w-full flex-row justify-end gap-2">
                <Button variant="ghost" onPress={onClose} className="motion-press">
                  取消
                </Button>
                <Button variant="primary" isPending={pending} onPress={save} className="motion-press">
                  保存
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface StickerEditFieldsProps {
  state: {
    sticker: AdminStickerRow;
    name: string;
    character: string;
    subCategory: string;
    tags: string;
    status: StickerStatus;
    error: string | null;
    topLevels: readonly Category[];
    subCategories: readonly Category[];
  };
  actions: {
    setName: (value: string) => void;
    setCharacter: (value: string) => void;
    setSubCategory: (value: string) => void;
    setTags: (value: string) => void;
    setStatus: (value: StickerStatus) => void;
  };
}

function StickerEditFields({ state, actions }: StickerEditFieldsProps) {
  const subCategoryOptions = [
    {
      value: "__placeholder",
      label: state.subCategories.length === 0 ? "（无子分类）" : "请选择",
    },
    ...state.subCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <StickerPreview sticker={state.sticker} />
      <Field label="名字">
        <Input
          value={state.name}
          onChange={(e) => actions.setName(e.target.value)}
          className="field-control modal-field bg-content1 px-3"
        />
      </Field>
      <Field label="角色">
        <OptionAutocomplete
          options={state.topLevels.map((c) => ({ value: c.id, label: c.name }))}
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
      <Field label="标签（逗号分隔）">
        <Input
          value={state.tags}
          onChange={(e) => actions.setTags(e.target.value)}
          className="field-control modal-field bg-content1 px-3"
        />
      </Field>
      <Field label="状态">
        <RoleSelect
          options={STATUS_OPTIONS}
          value={state.status}
          onChange={(value) => actions.setStatus(value as StickerStatus)}
        />
      </Field>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </div>
  );
}

function StickerPreview({ sticker }: { sticker: AdminStickerRow }) {
  return (
    <div className="flex justify-center">
      <Image
        src={sticker.src}
        alt={sticker.name}
        width={128}
        height={128}
        className="rounded-md object-contain"
        unoptimized={sticker.ext === "gif"}
      />
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
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return options;
    return options.filter((option) => {
      return option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text);
    });
  }, [options, query]);

  return (
    <Autocomplete
      aria-label="选择"
      selectedKey={value}
      onSelectionChange={(key) => onChange(key === null ? "" : String(key))}
    >
      <Autocomplete.Trigger className="field-trigger modal-field bg-content1">
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="motion-popover popover-surface min-w-72 p-2">
        <div className="sticky top-0 z-10 bg-content1 pb-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索..."
            className="field-control"
          />
        </div>
        <Autocomplete.Filter>
          <ListBox>
            {filteredOptions.map((o) => (
              <ListBox.Item
                key={o.value}
                id={o.value}
                textValue={o.label}
                className="listbox-option"
              >
                {o.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

function RoleSelect({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      aria-label="选择"
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
    >
      <Select.Trigger className="field-trigger modal-field bg-content1">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface">
        <ListBox>
          {options.map((o) => (
            <ListBox.Item
              key={o.value}
              id={o.value}
              textValue={o.label}
              className="listbox-option"
            >
              {o.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}
