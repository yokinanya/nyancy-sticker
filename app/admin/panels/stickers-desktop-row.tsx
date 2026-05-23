"use client";

import Image from "next/image";
import { Button, Checkbox, Chip } from "@/components/ui/heroui-compat";
import type { AdminStickerRow } from "@/lib/queries/admin-stickers";
import { StatusChip } from "./stickers-table-parts";

export function StickerDesktopRow({
  categoryDisplay,
  item,
  onEdit,
  onToggle,
  selected,
}: {
  categoryDisplay: string;
  item: AdminStickerRow;
  onEdit: (item: AdminStickerRow) => void;
  onToggle: (id: string) => void;
  selected: boolean;
}) {
  return (
    <tr className={`border-b border-default-100 hover:bg-primary/6 last:border-0 ${selected ? "bg-primary/10" : ""}`}>
      <td className="p-3">
        <Checkbox aria-label={`选择 ${item.name}`} isSelected={selected} onChange={() => onToggle(item.id)}>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox>
      </td>
      <StickerPreviewCell item={item} />
      <StickerNameCell item={item} />
      <td className="p-3 text-xs text-default-500">{categoryDisplay}</td>
      <StickerTagsCell tags={item.tags} />
      <td className="p-3">
        <StatusChip status={item.status} />
      </td>
      <SubmitterCell item={item} />
      <td className="p-3">
        <Button size="sm" variant="ghost" onPress={() => onEdit(item)} className="motion-press">
          编辑
        </Button>
      </td>
    </tr>
  );
}

function StickerPreviewCell({ item }: { item: AdminStickerRow }) {
  return (
    <td className="p-3">
      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-default-200 bg-default-100">
        <Image src={item.previewSrc} alt={item.name} fill sizes="48px" className="object-contain p-1" unoptimized />
      </div>
    </td>
  );
}

function StickerNameCell({ item }: { item: AdminStickerRow }) {
  return (
    <td className="p-3">
      <div className="font-medium">{item.name}</div>
      <div className="font-mono text-xs text-default-400">
        {item.id} · {item.width}×{item.height} · {item.ext}
      </div>
    </td>
  );
}

function StickerTagsCell({ tags }: { tags: readonly string[] }) {
  return (
    <td className="p-3">
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 ? (
          <span className="text-xs text-default-400">—</span>
        ) : (
          tags.map((tag) => (
            <Chip key={tag} size="sm" variant="soft">
              <Chip.Label>#{tag}</Chip.Label>
            </Chip>
          ))
        )}
      </div>
    </td>
  );
}

function SubmitterCell({ item }: { item: AdminStickerRow }) {
  return (
    <td className="p-3 text-xs text-default-500">
      <div>{item.submitterLogin ? `@${item.submitterLogin}` : (item.submitterName ?? "—")}</div>
      <div className="text-[10px] text-default-400">
        {new Date(item.submittedAt).toLocaleDateString("zh-CN")}
      </div>
    </td>
  );
}
