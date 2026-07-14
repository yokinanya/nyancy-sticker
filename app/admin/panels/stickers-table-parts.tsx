"use client";

import { Chip, ListBox, Select } from "@/components/ui/heroui-compat";
import type { StickerStatus } from "@/lib/queries/admin-stickers";
import { selectedOptionLabel } from "@/lib/option-label";

export const STATUS_LABEL: Record<StickerStatus, string> = {
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
        <Select.Value className="min-w-0 flex-1 truncate">
          {selectedOptionLabel(PAGE_SIZE_OPTIONS, value)}
        </Select.Value>
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface">
        <ListBox>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
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
