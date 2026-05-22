import { and, asc, eq, inArray, sql } from "drizzle-orm";
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

export async function listCharacterGallery(
  characterId: string,
): Promise<{
  character: { id: string; name: string } | null;
  stickers: Sticker[];
  categories: Category[];
}> {
  const result = await db.execute<CharacterGalleryRow>(sql`
    WITH selected_categories AS (
      SELECT id, name, "parentId"
      FROM "category"
      WHERE id = ${characterId} OR "parentId" = ${characterId}
    )
    SELECT
      (
        SELECT jsonb_build_object('id', id, 'name', name)
        FROM selected_categories
        WHERE id = ${characterId} AND "parentId" IS NULL
        LIMIT 1
      ) AS character,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', id, 'name', name, 'parentId', "parentId")
            ORDER BY id ASC
          )
          FROM selected_categories
        ),
        '[]'::jsonb
      ) AS categories,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'src', s.src,
              'width', s.width,
              'height', s.height,
              'category', s."categoryId",
              'tags', s.tags,
              'ext', s.ext,
              'hash', s.hash
            )
            ORDER BY s.id ASC
          )
          FROM "sticker" s
          WHERE s.status = 'approved'
            AND s."categoryId" IN (SELECT id FROM selected_categories)
        ),
        '[]'::jsonb
      ) AS stickers
  `);
  const row = result.rows[0];
  if (!row?.character) return { character: null, stickers: [], categories: [] };
  const cats = row.categories.map(normalizeCategory);
  return {
    character: row.character,
    stickers: row.stickers,
    categories: cats,
  };
}

interface CharacterGalleryRow extends Record<string, unknown> {
  character: { id: string; name: string } | null;
  categories: RawCategory[];
  stickers: Sticker[];
}

interface RawCategory {
  id: string;
  name: string;
  parentId: string | null;
}

function normalizeCategory(category: RawCategory): Category {
  return {
    id: category.id,
    name: category.name,
    ...(category.parentId ? { parentId: category.parentId } : {}),
  };
}
