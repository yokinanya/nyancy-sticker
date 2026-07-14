"use client";

import { memo } from "react";
import { Button, Checkbox, Chip } from "@/components/ui/heroui-compat";
import type { AdminStickerRow } from "@/lib/queries/admin-stickers";
import { StatusChip } from "./stickers-table-parts";

interface Props {
  readonly items: readonly AdminStickerRow[];
  readonly categoryDisplayMap: ReadonlyMap<string, string>;
  readonly selectedSet: ReadonlySet<string>;
  readonly onEdit: (item: AdminStickerRow) => void;
  readonly onToggle: (id: string) => void;
}

export function StickersResponsiveList(options: Props) {
  if (options.items.length === 0) {
    return (
      <p className="admin-panel p-6 text-center text-sm text-default-400">
        没有匹配的贴纸。调整筛选或翻页试试。
      </p>
    );
  }
  return (
    <ul className="grid gap-2 md:overflow-hidden md:rounded-lg md:border md:border-border-subtle md:bg-surface/80 md:shadow-sm">
      {options.items.map((item) => (
        <StickerResponsiveRow
          key={item.id}
          item={item}
          categoryDisplay={options.categoryDisplayMap.get(item.categoryId) ?? item.categoryId}
          selected={options.selectedSet.has(item.id)}
          onEdit={options.onEdit}
          onToggle={options.onToggle}
        />
      ))}
    </ul>
  );
}

const StickerResponsiveRow = memo(function StickerResponsiveRow({
  item,
  categoryDisplay,
  selected,
  onEdit,
  onToggle,
}: {
  readonly item: AdminStickerRow;
  readonly categoryDisplay: string;
  readonly selected: boolean;
  readonly onEdit: (item: AdminStickerRow) => void;
  readonly onToggle: (id: string) => void;
}) {
  return (
    <li
      className={`admin-panel grid grid-cols-[auto_5rem_minmax(0,1fr)] gap-3 p-3 md:grid-cols-[2.5rem_4rem_minmax(10rem,1.5fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_6rem_minmax(7rem,0.8fr)_4rem] md:items-center md:rounded-none md:border-0 md:border-b md:border-default-100 ${
        selected ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <Checkbox
        aria-label={`选择 ${item.name}`}
        isSelected={selected}
        onChange={() => onToggle(item.id)}
      >
        <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
      </Checkbox>
      <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-default-100 md:h-12 md:w-12 md:rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewSrc}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-1.5 md:p-1"
        />
      </div>
      <StickerIdentity item={item} />
      <StickerCategory label={categoryDisplay} />
      <StickerTags tags={item.tags} />
      <div className="col-start-2 md:col-auto"><StatusChip status={item.status} /></div>
      <StickerSubmitter item={item} />
      <Button size="sm" variant="ghost" onPress={() => onEdit(item)} className="motion-press">
        编辑
      </Button>
    </li>
  );
});

function StickerCategory({ label }: { readonly label: string }) {
  return (
    <div className="col-start-2 col-end-4 flex flex-wrap gap-1 md:col-auto">
      <Chip size="sm" variant="soft"><Chip.Label>{label}</Chip.Label></Chip>
    </div>
  );
}

function StickerSubmitter({ item }: { readonly item: AdminStickerRow }) {
  return (
    <div className="text-xs text-default-500">
      <div>{item.submitterLogin ? `@${item.submitterLogin}` : (item.submitterName ?? "—")}</div>
      <div className="text-[10px] text-default-400">{new Date(item.submittedAt).toLocaleDateString("zh-CN")}</div>
    </div>
  );
}

function StickerIdentity({ item }: { readonly item: AdminStickerRow }) {
  return (
    <div className="min-w-0">
      <h3 className="truncate text-sm font-medium">{item.name}</h3>
      <p className="mt-1 font-mono text-[11px] text-default-400">
        {item.id} · {item.width}×{item.height} · {item.ext}
      </p>
    </div>
  );
}

function StickerTags({ tags }: { readonly tags: readonly string[] }) {
  return (
    <div className="col-start-2 col-end-4 flex flex-wrap gap-1 md:col-auto">
      {tags.length === 0 ? (
        <span className="text-xs text-default-400">无标签</span>
      ) : (
        tags.slice(0, 6).map((tag) => (
          <Chip key={tag} size="sm" variant="soft"><Chip.Label>#{tag}</Chip.Label></Chip>
        ))
      )}
    </div>
  );
}
