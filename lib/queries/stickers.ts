import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers } from "@/drizzle/schema";
import type { Sticker, Category } from "@/lib/types";

export async function listApprovedStickers(): Promise<Sticker[]> {
  const rows = await db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      width: stickers.width,
      height: stickers.height,
      category: stickers.categoryId,
      tags: stickers.tags,
      ext: stickers.ext,
      hash: stickers.hash,
    })
    .from(stickers)
    .where(eq(stickers.status, "approved"))
    .orderBy(asc(stickers.id));
  return rows;
}

/**
 * 列出某个角色下的所有 approved 贴纸 + 该角色及其子分类的 Category 列表。
 */
export async function listApprovedStickersByCharacter(
  characterId: string,
): Promise<{ stickers: Sticker[]; categories: Category[] }> {
  const allCategories = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.id, characterId))
    .union(
      db
        .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.parentId, characterId)),
    )
    .orderBy(asc(categories.id));

  if (allCategories.length === 0) return { stickers: [], categories: [] };

  const categoryIds = allCategories.map((c) => c.id);

  const stickerRows = await db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      width: stickers.width,
      height: stickers.height,
      category: stickers.categoryId,
      tags: stickers.tags,
      ext: stickers.ext,
      hash: stickers.hash,
    })
    .from(stickers)
    .where(and(eq(stickers.status, "approved"), inArray(stickers.categoryId, categoryIds)))
    .orderBy(asc(stickers.id));

  const cats: Category[] = allCategories.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.parentId ? { parentId: c.parentId } : {}),
  }));

  return { stickers: stickerRows, categories: cats };
}
