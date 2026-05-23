"use client";

import Image from "next/image";
import { memo } from "react";
import { Button, Chip, ListBox, Select } from "@heroui/react";
import type { AdminStickerRow, StickerSort, StickerStatus } from "@/lib/queries/admin-stickers";

const STATUS_LABEL: Record<StickerStatus, string> = {
  approved: "已发布",
  pending: "待审核",
  rejected: "已拒绝",
};

const STATUS_COLOR: Record<StickerStatus, "primary" | "secondary" | "soft"> = {
  approved: "primary",
  pending: "secondary",
  rejected: "soft",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100].map((value) => ({
  value: String(value),
  label: `每页 ${value} 行`,
}));

export function StatusChip({ status }: { status: StickerStatus }) {
  return (
    <Chip size="sm" variant={STATUS_COLOR[status]}>
      <Chip.Label>{STATUS_LABEL[status]}</Chip.Label>
    </Chip>
  );
}

export function SortableHeader({
  label,
  sort,
  asc,
  desc,
  onSort,
}: {
  label: string;
  sort: StickerSort;
  asc: StickerSort;
  desc: StickerSort;
  onSort: (sort: StickerSort) => void;
}) {
  const isAsc = sort === asc;
  const indicator = isAsc ? "↑" : sort === desc ? "↓" : "";

  return (
    <th className="p-3">
      <Button
        size="sm"
        variant="ghost"
        onPress={() => onSort(isAsc ? desc : asc)}
        className="motion-press -ml-2 h-8 min-w-0 px-2 text-xs text-default-500"
      >
        {label}
        <span className="inline-block w-3 text-center">{indicator}</span>
      </Button>
    </th>
  );
}

export function PageSizeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      aria-label="每页行数"
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
      className="w-28"
    >
      <Select.Trigger className="field-trigger flex h-9 min-h-9 items-center gap-2 px-2">
        <Select.Value className="min-w-0 flex-1 truncate" />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface">
        <ListBox>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="listbox-option"
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export const StickerMobileCard = memo(function StickerMobileCard({
  item,
  selected,
  onToggle,
  onEdit,
}: {
  item: AdminStickerRow;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (item: AdminStickerRow) => void;
}) {
  return (
    <article className={`admin-panel p-3 ${selected ? "border-primary/60 bg-primary/5" : ""}`}>
      <div className="flex gap-3">
        <div className="relative h-20 w-20 flex-none overflow-hidden rounded-lg bg-default-100">
          <Image
            src={item.src}
            alt={item.name}
            fill
            sizes="80px"
            className="object-contain p-1.5"
            unoptimized={item.ext === "gif"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{item.name}</h3>
              <p className="mt-1 font-mono text-[11px] text-default-400">
                {item.id} · {item.width}×{item.height} · {item.ext}
              </p>
            </div>
            <Button
              size="sm"
              variant={selected ? "primary" : "ghost"}
              onPress={() => onToggle(item.id)}
              className="motion-press flex-none transition-colors duration-150"
              aria-pressed={selected}
            >
              {selected ? "已选择" : "选择"}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <StatusChip status={item.status} />
            <Chip size="sm" variant="soft">
              <Chip.Label>{item.categoryId}</Chip.Label>
            </Chip>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {item.tags.length === 0 ? (
          <span className="text-xs text-default-400">无标签</span>
        ) : (
          item.tags.slice(0, 6).map((tag) => (
            <Chip key={tag} size="sm" variant="soft">
              <Chip.Label>#{tag}</Chip.Label>
            </Chip>
          ))
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-default-100 pt-3">
        <span className="text-xs text-default-500">
          {item.submitterLogin ? `@${item.submitterLogin}` : (item.submitterName ?? "—")}
        </span>
        <Button size="sm" variant="ghost" onPress={() => onEdit(item)} className="motion-press">
          编辑
        </Button>
      </div>
    </article>
  );
});
