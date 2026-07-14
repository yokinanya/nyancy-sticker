import type { AdminStickerRow, StickerSort } from "@/lib/queries/admin-stickers";
import type { Category, Character } from "@/lib/types";

export interface StickersTableProps {
  readonly items: readonly AdminStickerRow[];
  readonly categories: readonly Category[];
  readonly characters: readonly Character[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly sort: StickerSort;
  readonly total: number;
}
