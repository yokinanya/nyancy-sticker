"use client";

import { memo } from "react";
import {
  Button,
  Chip,
  Input,
  ProgressBar,
} from "@/components/ui/heroui-compat";
import type {
  PatchUploadItem,
  UploadItem,
  UploadItemStatus,
  UploadSummary,
} from "./types";

const PERCENT_MAX = 100;
const BYTES_PER_KIBIBYTE = 1024;

const STATUS_CONFIG: Readonly<
  Record<UploadItemStatus, { label: string; variant: "primary" | "secondary" | "soft" }>
> = {
  processing: { label: "解析中", variant: "soft" },
  ready: { label: "就绪", variant: "secondary" },
  uploading: { label: "上传中", variant: "primary" },
  done: { label: "已提交", variant: "primary" },
  error: { label: "失败", variant: "soft" },
  duplicate: { label: "重复", variant: "soft" },
  invalid: { label: "不合规", variant: "soft" },
};

interface PanelProps {
  readonly items: readonly UploadItem[];
  readonly summary: UploadSummary;
  readonly uploading: boolean;
  readonly submitLabel: string;
  readonly onClear: () => void;
  readonly onStart: () => void;
  readonly onPatch: PatchUploadItem;
  readonly onRemove: (clientId: string) => void;
}

export function UploadQueuePanel(options: PanelProps) {
  if (options.items.length === 0) return null;
  return (
    <>
      <div className="admin-toolbar flex flex-wrap items-center gap-3 p-3 text-sm">
        <UploadCounts summary={options.summary} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            isDisabled={options.uploading}
            onPress={options.onClear}
            className="motion-press"
          >
            全部清空
          </Button>
          <Button
            variant="primary"
            isPending={options.uploading}
            isDisabled={options.uploading || options.summary.uploadable === 0}
            onPress={options.onStart}
            className="motion-press"
          >
            {options.uploading
              ? "上传中"
              : `${options.submitLabel} (${options.summary.uploadable})`}
          </Button>
        </div>
      </div>
      {options.uploading ? (
        <ProgressBar
          aria-label="总进度"
          value={options.summary.totalProgress}
          maxValue={PERCENT_MAX}
          size="sm"
        />
      ) : null}
      <ul className="flex flex-col gap-2">
        {options.items.map((item) => (
          <UploadItemRow
            key={item.clientId}
            item={item}
            disabled={options.uploading}
            onPatch={options.onPatch}
            onRemove={options.onRemove}
          />
        ))}
      </ul>
    </>
  );
}

const UploadItemRow = memo(function UploadItemRow({
  item,
  disabled,
  onPatch,
  onRemove,
}: {
  readonly item: UploadItem;
  readonly disabled: boolean;
  readonly onPatch: PatchUploadItem;
  readonly onRemove: (clientId: string) => void;
}) {
  return (
    <li className="motion-list-item flex flex-col gap-3 rounded-lg border border-default-200 bg-content1 p-3 sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.previewUrl}
        alt={item.name}
        className="h-20 w-20 flex-shrink-0 rounded-md bg-default-50 object-contain"
      />
      <div className="flex flex-1 flex-col gap-2">
        <ItemHeader item={item} disabled={disabled} onRemove={onRemove} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={item.name}
            onChange={(event) => onPatch(item.clientId, { name: event.target.value })}
            disabled={disabled}
            placeholder="名字"
            className="field-control"
          />
          <Input
            value={item.tags}
            onChange={(event) => onPatch(item.clientId, { tags: event.target.value })}
            disabled={disabled}
            placeholder="额外标签（逗号分隔，可空）"
            className="field-control"
          />
        </div>
        {item.status === "uploading" ? (
          <ProgressBar aria-label="上传进度" value={item.progress} maxValue={PERCENT_MAX} size="sm" />
        ) : null}
        {item.errorMsg ? <p className="text-xs text-danger">{item.errorMsg}</p> : null}
      </div>
    </li>
  );
});

function ItemHeader(options: {
  readonly item: UploadItem;
  readonly disabled: boolean;
  readonly onRemove: (clientId: string) => void;
}) {
  const item = options.item;
  return (
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
        isDisabled={options.disabled}
        onPress={() => options.onRemove(item.clientId)}
        className="ml-auto"
      >
        移除
      </Button>
    </div>
  );
}

function UploadCounts({ summary }: { readonly summary: UploadSummary }) {
  return (
    <span className="text-default-500">
      共 {summary.total} 张 · 就绪 {summary.ready} · 完成 {summary.done}
      {summary.duplicate > 0 ? ` · 重复 ${summary.duplicate}` : ""}
      {summary.errored > 0 ? ` · 失败 ${summary.errored}` : ""}
      {summary.invalid > 0 ? ` · 不合规 ${summary.invalid}` : ""}
    </span>
  );
}

function StatusChip({ status }: { readonly status: UploadItemStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Chip size="sm" variant={config.variant}>
      <Chip.Label>{config.label}</Chip.Label>
    </Chip>
  );
}

function formatSize(bytes: number): string {
  if (bytes < BYTES_PER_KIBIBYTE) return `${bytes} B`;
  const kibibytes = bytes / BYTES_PER_KIBIBYTE;
  if (kibibytes < BYTES_PER_KIBIBYTE) return `${kibibytes.toFixed(0)} KB`;
  return `${(kibibytes / BYTES_PER_KIBIBYTE).toFixed(1)} MB`;
}
