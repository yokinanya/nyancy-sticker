import "server-only";

import { eq, inArray } from "drizzle-orm";
import { categories, stickers } from "@/drizzle/schema";
import { db } from "@/lib/db";

export interface StickerMutationRow {
  readonly id: string;
  readonly status: "approved" | "pending" | "rejected";
  readonly characterId: string;
}

export function listStickerMutationRows(
  ids: readonly string[],
): Promise<StickerMutationRow[]> {
  return db
    .select({
      id: stickers.id,
      status: stickers.status,
      characterId: categories.characterId,
    })
    .from(stickers)
    .innerJoin(categories, eq(stickers.categoryId, categories.id))
    .where(inArray(stickers.id, ids));
}

export async function requireStickerMutationRow(
  id: string,
): Promise<StickerMutationRow> {
  const rows = await listStickerMutationRows([id]);
  const row = rows[0];
  if (!row) throw new Error(`贴纸不存在：${id}`);
  return row;
}
