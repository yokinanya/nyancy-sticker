"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Input, ListBox, ProgressBar, Select } from "@heroui/react";
import { useFeedback } from "@/components/feedback";
import type { Category } from "@/lib/types";
import {
  baseName,
  extOfName,
  isImageFile,
  MAX_SIZE_BYTES,
  type StickerExt,
} from "@/lib/image-shared";
import { CreateSubcategoryModal } from "@/app/submit/create-subcategory-modal";

type ItemStatus =
  | "processing"
  | "ready"
  | "uploading"
  | "done"
  | "error"
  | "duplicate"
  | "invalid";

interface Item {
  clientId: string;
  file: File;
  previewUrl: string;
  hash?: string;
  width?: number;
  height?: number;
  ext: StickerExt | null;
  name: string;
  tags: string;
  status: ItemStatus;
  progress: number;
  errorMsg?: string;
}

interface Props {
  categories: readonly Category[];
  /** 单张上传 endpoint，POST multipart formData。默认 /api/submit。 */
  endpoint?: string;
  /** 按钮文案，比如「开始上传」、「批量发布」。 */
  submitLabel?: string;
  /** 是否允许新建子分类。 */
  allowCreateSubcategory?: boolean;
}

export function BatchUploadForm({
  categories: serverCategories,
  endpoint = "/api/submit",
  submitLabel = "开始上传",
  allowCreateSubcategory = true,
}: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [extraCategories, setExtraCategories] = useState<Category[]>([]);
  const allCategories = useMemo(
    () => [...serverCategories, ...extraCategories],
    [serverCategories, extraCategories],
  );
  const topLevels = useMemo(() => allCategories.filter((c) => !c.parentId), [allCategories]);

  const [character, setCharacter] = useState(topLevels[0]?.id ?? "");
  const [subCategory, setSubCategory] = useState("");
  const subCategories = useMemo(
    () => allCategories.filter((c) => c.parentId === character),
    [allCategories, character],
  );
  const currentCharacterName = topLevels.find((c) => c.id === character)?.name ?? "";

  const [defaultTags, setDefaultTags] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const totalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.status === "done").length;
    return Math.round((done / items.length) * 100);
  }, [items]);

  const ready = items.filter((i) => i.status === "ready").length;
  const done = items.filter((i) => i.status === "done").length;
  const errored = items.filter((i) => i.status === "error").length;
  const duplicate = items.filter((i) => i.status === "duplicate").length;

  const onPickFiles = (rawFiles: readonly File[]) => {
    const filtered = rawFiles.filter(isImageFile);
    const newItems: Item[] = filtered.map((file) => ({
      clientId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      ext: extOfName(file.name),
      name: baseName(file.name),
      tags: "",
      status: file.size > MAX_SIZE_BYTES ? "invalid" : "processing",
      progress: 0,
      errorMsg: file.size > MAX_SIZE_BYTES ? `>8MB 已忽略` : undefined,
    }));
    setItems((prev) => [...prev, ...newItems]);
    feedback.info(`已添加 ${newItems.length} 张图片`);
    // 预处理：算 hash + 尺寸（并行）
    newItems
      .filter((i) => i.status === "processing")
      .forEach((i) => void preprocessItem(i, setItems));
    // 预处理完后做一次重复检测（用 setTimeout 等所有 hash 完成）
    void runDuplicateCheck(newItems);
  };

  const runDuplicateCheck = async (created: Item[]) => {
    // 等待这批的 hash 算完
    const interval = setInterval(() => {
      setItems((curr) => {
        const stillProcessing = curr.some(
          (i) => created.find((c) => c.clientId === i.clientId) && i.status === "processing",
        );
        if (!stillProcessing) {
          clearInterval(interval);
          const hashes = curr
            .filter((i) => created.find((c) => c.clientId === i.clientId) && i.hash)
            .map((i) => i.hash!);
          if (hashes.length > 0) void checkHashes(hashes);
        }
        return curr;
      });
    }, 200);
    setTimeout(() => clearInterval(interval), 60_000);
  };

  const checkHashes = async (hashes: string[]) => {
    try {
      const res = await fetch("/api/check-hashes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashes }),
      });
      const data = (await res.json()) as
        | { ok: true; existing: { hash: string }[] }
        | { ok: false; error: string };
      if (!data.ok) {
        feedback.error(data.error);
        return;
      }
      const exists = new Set(data.existing.map((e) => e.hash));
      setItems((prev) =>
        prev.map((i) =>
          i.status === "ready" && i.hash && exists.has(i.hash)
            ? { ...i, status: "duplicate", errorMsg: "已存在或在审核队列里" }
            : i,
        ),
      );
    } catch (e) {
      feedback.error(e instanceof Error ? e.message : "重复检测失败。");
    }
  };

  const removeItem = (clientId: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.clientId === clientId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.clientId !== clientId);
    });
  };

  const updateItem = (clientId: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.clientId === clientId ? { ...i, ...patch } : i)));
  };

  const onStartUpload = async () => {
    if (!character) {
      feedback.error("请先选择角色。");
      return;
    }
    if (!subCategory) {
      feedback.error("请选择子分类（或新建一个）。");
      return;
    }
    const list = items.filter((i) => i.status === "ready" || i.status === "error");
    if (list.length === 0) {
      feedback.error("没有可上传的图片。");
      return;
    }
    setUploading(true);
    const loadingId = feedback.loading(`正在上传 ${list.length} 张图片`);
    for (const item of list) {
      updateItem(item.clientId, { status: "uploading", progress: 0, errorMsg: undefined });
      try {
        await uploadOne(item, endpoint, subCategory, defaultTags, (p) =>
          updateItem(item.clientId, { progress: p }),
        );
        updateItem(item.clientId, { status: "done", progress: 100 });
      } catch (e) {
        updateItem(item.clientId, {
          status: "error",
          errorMsg: e instanceof Error ? e.message : "上传失败",
        });
      }
    }
    setUploading(false);
    feedback.dismiss(loadingId);
    feedback.success("处理完成，可关闭页面或继续上传。");
    router.refresh();
  };

  const onSubcategoryCreated = (cat: Category) => {
    setExtraCategories((prev) => [...prev, cat]);
    setSubCategory(cat.id);
    setCreateOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="admin-panel flex flex-col gap-3 p-4">
        <div className="grid gap-3 grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <Field label="角色" className="col-span-2 md:col-span-1">
            <PlainSelect
              ariaLabel="角色"
              value={character}
              onChange={(v) => {
                setCharacter(v);
                setSubCategory("");
              }}
              options={topLevels.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
          <Field label="子分类">
            <PlainSelect
              ariaLabel="子分类"
              value={subCategory || "__placeholder"}
              onChange={(v) => setSubCategory(v === "__placeholder" ? "" : v)}
              options={[
                {
                  value: "__placeholder",
                  label: subCategories.length === 0 ? "（暂无子分类）" : "请选择",
                },
                ...subCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>
          <Button
            variant="ghost"
            isDisabled={!character || !allowCreateSubcategory}
            onPress={() => setCreateOpen(true)}
            className="self-end md:min-w-24"
          >
            + 新建
          </Button>
        </div>
        <Field label="默认标签（每张可单独追加）">
          <Input
            value={defaultTags}
            onChange={(e) => setDefaultTags(e.target.value)}
            placeholder="逗号分隔，可空"
            className="field-control"
          />
        </Field>
      </section>

      <DropArea
        dragOver={dragOver}
        setDragOver={setDragOver}
        onPick={onPickFiles}
        onClick={() => fileInputRef.current?.click()}
        hasItems={items.length > 0}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          onPickFiles([...(e.currentTarget.files ?? [])]);
          e.currentTarget.value = "";
        }}
      />

      {items.length > 0 ? (
        <>
          <div className="admin-toolbar flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="text-default-500">
              共 {items.length} 张 · 就绪 {ready} · 完成 {done}
              {duplicate > 0 ? ` · 重复 ${duplicate}` : ""}
              {errored > 0 ? ` · 失败 ${errored}` : ""}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                isDisabled={uploading}
                onPress={() => {
                  items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
                  setItems([]);
                }}
                className="motion-press"
              >
                全部清空
              </Button>
              <Button
                variant="primary"
                isPending={uploading}
                isDisabled={uploading || (ready === 0 && errored === 0)}
                onPress={onStartUpload}
                className="motion-press"
              >
                {uploading ? "上传中" : `${submitLabel} (${ready + errored})`}
              </Button>
            </div>
          </div>

          {uploading ? (
            <ProgressBar aria-label="总进度" value={totalProgress} maxValue={100} size="sm" />
          ) : null}

          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <BatchItemRow
                key={item.clientId}
                item={item}
                disabled={uploading}
                onUpdate={(patch) => updateItem(item.clientId, patch)}
                onRemove={() => removeItem(item.clientId)}
              />
            ))}
          </ul>
        </>
      ) : null}

      {createOpen && character ? (
        <CreateSubcategoryModal
          parentId={character}
          parentName={currentCharacterName}
          onClose={() => setCreateOpen(false)}
          onCreated={onSubcategoryCreated}
        />
      ) : null}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ""}`}>
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}

function PlainSelect({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Select
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
    >
      <Select.Trigger className="field-trigger">
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

function DropArea({
  dragOver,
  setDragOver,
  onPick,
  onClick,
  hasItems,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onPick: (files: readonly File[]) => void;
  onClick: () => void;
  hasItems: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onPick([...e.dataTransfer.files]);
      }}
      className={`dropzone-feedback ui-focus flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-content1 ${
        hasItems ? "p-4" : "p-10"
      } transition ${
        dragOver ? "border-primary bg-primary/5" : "border-default-300 hover:border-default-400"
      }`}
    >
      <div className="text-sm text-default-500">
        {hasItems ? "点击或拖入继续添加" : "点击选择文件，或拖拽图片/目录到此处（支持多张）"}
      </div>
    </div>
  );
}

function BatchItemRow({
  item,
  disabled,
  onUpdate,
  onRemove,
}: {
  item: Item;
  disabled: boolean;
  onUpdate: (patch: Partial<Item>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="motion-list-item flex flex-col gap-3 rounded-lg border border-default-200 bg-content1 p-3 sm:flex-row">
      <div className="flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={item.name}
          className="h-20 w-20 rounded-md object-contain bg-default-50"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={item.status} />
          <span className="text-xs text-default-400">
            {item.file.name} · {formatSize(item.file.size)}
            {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
            {item.ext ? ` · ${item.ext}` : ""}
          </span>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={disabled}
            onPress={onRemove}
            className="ml-auto"
          >
            移除
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            disabled={disabled}
            placeholder="名字"
            className="field-control"
          />
          <Input
            value={item.tags}
            onChange={(e) => onUpdate({ tags: e.target.value })}
            disabled={disabled}
            placeholder="额外标签（逗号分隔，可空）"
            className="field-control"
          />
        </div>
        {item.status === "uploading" ? (
          <ProgressBar aria-label="上传进度" value={item.progress} maxValue={100} size="sm" />
        ) : null}
        {item.errorMsg ? (
          <p className="text-xs text-danger">{item.errorMsg}</p>
        ) : null}
      </div>
    </li>
  );
}

function StatusChip({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { label: string; variant: "primary" | "secondary" | "soft" }> = {
    processing: { label: "解析中", variant: "soft" },
    ready: { label: "就绪", variant: "secondary" },
    uploading: { label: "上传中", variant: "primary" },
    done: { label: "已提交", variant: "primary" },
    error: { label: "失败", variant: "soft" },
    duplicate: { label: "重复", variant: "soft" },
    invalid: { label: "不合规", variant: "soft" },
  };
  const conf = map[status];
  return (
    <Chip size="sm" variant={conf.variant}>
      <Chip.Label>{conf.label}</Chip.Label>
    </Chip>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function preprocessItem(
  item: Item,
  setItems: React.Dispatch<React.SetStateAction<Item[]>>,
) {
  try {
    const [hash, dims] = await Promise.all([
      computeHash(item.file),
      decodeDimensions(item.previewUrl),
    ]);
    setItems((prev) =>
      prev.map((p) =>
        p.clientId === item.clientId
          ? { ...p, hash, width: dims.width, height: dims.height, status: "ready" }
          : p,
      ),
    );
  } catch (e) {
    setItems((prev) =>
      prev.map((p) =>
        p.clientId === item.clientId
          ? {
              ...p,
              status: "invalid",
              errorMsg: e instanceof Error ? e.message : "解析失败",
            }
          : p,
      ),
    );
  }
}

async function computeHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function decodeDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("无法解码图片"));
    img.src = url;
  });
}

function uploadOne(
  item: Item,
  endpoint: string,
  category: string,
  defaultTags: string,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.set("file", item.file);
    fd.set("category", category);
    fd.set("name", item.name.trim() || baseName(item.file.name));
    fd.set("tags", mergeTags(defaultTags, item.tags));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText || "{}") as
          | { ok: true }
          | { ok: false; error: string };
        if (xhr.status >= 200 && xhr.status < 300 && result.ok) resolve();
        else reject(new Error(("error" in result && result.error) || `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.send(fd);
  });
}

function mergeTags(a: string, b: string): string {
  const all = [...a.split(","), ...b.split(",")].map((t) => t.trim()).filter(Boolean);
  return [...new Set(all)].join(", ");
}
