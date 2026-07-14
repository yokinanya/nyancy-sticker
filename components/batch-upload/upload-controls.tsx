"use client";

import type { ReactNode } from "react";
import { Button, ListBox, Select } from "@/components/ui/heroui-compat";
import { selectedOptionLabel } from "@/lib/option-label";
import type { Category, CharacterRef } from "@/lib/types";
import type { UploadMode } from "./types";

const UPLOAD_MODE_OPTIONS = [
  { value: "direct", label: "R2 直传" },
  { value: "server", label: "服务器中转" },
] as const;

interface ConfigurationProps {
  readonly characters: readonly CharacterRef[];
  readonly subCategories: readonly Category[];
  readonly character: string;
  readonly subCategory: string;
  readonly uploadMode: UploadMode;
  readonly canCreateSubcategory: boolean;
  readonly onCharacterChange: (value: string) => void;
  readonly onSubCategoryChange: (value: string) => void;
  readonly onUploadModeChange: (value: UploadMode) => void;
  readonly onCreateSubcategory: () => void;
}

export function UploadConfiguration(options: ConfigurationProps) {
  const categoryOptions = [
    {
      value: "__placeholder",
      label: options.subCategories.length === 0 ? "（暂无子分类）" : "请选择",
    },
    ...options.subCategories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];
  return (
    <section className="admin-panel flex flex-col gap-3 p-4">
      <CategoryConfiguration options={options} categoryOptions={categoryOptions} />
      <Field label="上传方式">
        <PlainSelect
          ariaLabel="上传方式"
          value={options.uploadMode}
          onChange={(value) => options.onUploadModeChange(value as UploadMode)}
          options={UPLOAD_MODE_OPTIONS}
        />
      </Field>
    </section>
  );
}

function CategoryConfiguration({ options, categoryOptions }: {
  readonly options: ConfigurationProps;
  readonly categoryOptions: readonly { value: string; label: string }[];
}) {
  const characterOptions = options.characters.map((item) => ({ value: item.id, label: item.name }));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <Field label="角色" className="col-span-2 md:col-span-1">
        <PlainSelect ariaLabel="角色" value={options.character} onChange={options.onCharacterChange} options={characterOptions} />
      </Field>
      <Field label="子分类">
        <PlainSelect ariaLabel="子分类" value={options.subCategory || "__placeholder"} onChange={(value) => options.onSubCategoryChange(value === "__placeholder" ? "" : value)} options={categoryOptions} />
      </Field>
      <Button variant="ghost" isDisabled={!options.canCreateSubcategory} onPress={options.onCreateSubcategory} className="self-end md:min-w-24">+ 新建</Button>
    </div>
  );
}

export function UploadDropArea(options: {
  readonly dragOver: boolean;
  readonly hasItems: boolean;
  readonly onClick: () => void;
  readonly onDropFiles: (dataTransfer: DataTransfer) => Promise<void>;
  readonly setDragOver: (value: boolean) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={options.onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") options.onClick();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        options.setDragOver(true);
      }}
      onDragLeave={() => options.setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        options.setDragOver(false);
        void options.onDropFiles(event.dataTransfer);
      }}
      className={`dropzone-feedback ui-focus flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-content1 ${
        options.hasItems ? "p-4" : "p-10"
      } transition ${
        options.dragOver
          ? "border-primary bg-primary/5"
          : "border-default-300 hover:border-default-400"
      }`}
    >
      <div className="text-sm text-default-500">
        {options.hasItems
          ? "点击或拖入继续添加"
          : "点击选择文件，或拖拽图片/目录到此处（支持多张）"}
      </div>
    </div>
  );
}

function PlainSelect(options: {
  readonly ariaLabel: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly { value: string; label: string }[];
}) {
  return (
    <Select
      aria-label={options.ariaLabel}
      selectedKey={options.value}
      onSelectionChange={(key) => options.onChange(String(key))}
    >
      <Select.Trigger className="field-trigger">
        <Select.Value>
          {selectedOptionLabel(options.options, options.value)}
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface">
        <ListBox>
          {options.options.map((item) => (
            <ListBox.Item key={item.value} id={item.value} className="listbox-option">
              {item.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Field({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ""}`}>
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}
