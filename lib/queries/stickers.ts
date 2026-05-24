import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers } from "@/drizzle/schema";
import type { Sticker, Category, CharacterVisibility } from "@/lib/types";

export async function listApprovedStickers(): Promise<Sticker[]> {
  const rows = await db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      previewSrc: stickers.previewSrc,
      width: stickers.width,
      height: stickers.height,
      category: stickers.categoryId,
      tags: stickers.tags,
      ext: stickers.ext,
    })
    .from(stickers)
    .where(eq(stickers.status, "approved"))
    .orderBy(asc(stickers.id));
  return rows.map(requirePreviewSrc);
}

/**
 * 列出某个角色下的所有 approved 贴纸 + 该角色及其子分类的 Category 列表。
 */
export async function listApprovedStickersByCharacter(
  characterId: string,
): Promise<{ stickers: Sticker[]; categories: Category[] }> {
  const allCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      characterId: categories.characterId,
    })
    .from(categories)
    .where(eq(categories.characterId, characterId))
    .orderBy(asc(categories.slug));

  if (allCategories.length === 0) return { stickers: [], categories: [] };

  const categoryIds = allCategories.map((c) => c.id);

  const stickerRows = await db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      previewSrc: stickers.previewSrc,
      width: stickers.width,
      height: stickers.height,
      category: stickers.categoryId,
      tags: stickers.tags,
      ext: stickers.ext,
    })
    .from(stickers)
    .where(and(eq(stickers.status, "approved"), inArray(stickers.categoryId, categoryIds)))
    .orderBy(asc(stickers.id));

  const cats: Category[] = allCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    characterId: c.characterId,
  }));

  return { stickers: stickerRows.map(requirePreviewSrc), categories: cats };
}

export async function listCharacterGallery(
  characterId: string,
): Promise<{
  character: CharacterGalleryCharacter | null;
  stickers: Sticker[];
  categories: Category[];
}> {
  const result = await db.execute<CharacterGalleryRow>(sql`
    WITH selected_categories AS (
      SELECT id, name, slug, "characterId"
      FROM "category"
      WHERE "characterId" = ${characterId}
    )
    SELECT
      (
        SELECT jsonb_build_object(
          'id', id,
          'name', name,
          'visibility', visibility,
          'backgroundImageUrl', "backgroundImageUrl"
        )
        FROM "character"
        WHERE id = ${characterId}
        LIMIT 1
      ) AS character,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', id, 'name', name, 'slug', slug, 'characterId', "characterId")
            ORDER BY slug ASC
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
              'previewSrc', s."previewSrc",
              'width', s.width,
              'height', s.height,
              'category', s."categoryId",
              'tags', s.tags,
              'ext', s.ext
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
    stickers: row.stickers.map(requirePreviewSrc),
    categories: cats,
  };
}

type QueriedSticker = Omit<Sticker, "previewSrc"> & {
  previewSrc: string | null;
};

function requirePreviewSrc(sticker: QueriedSticker): Sticker {
  if (!sticker.previewSrc) {
    throw new Error(`贴纸缺少 previewSrc：${sticker.id}，请先运行 pnpm db:backfill-previews。`);
  }
  return { ...sticker, previewSrc: sticker.previewSrc };
}

interface CharacterGalleryRow extends Record<string, unknown> {
  character: CharacterGalleryCharacter | null;
  categories: RawCategory[];
  stickers: QueriedSticker[];
}

interface RawCategory {
  id: string;
  name: string;
  slug: string;
  characterId: string;
}

interface CharacterGalleryCharacter {
  id: string;
  name: string;
  visibility: CharacterVisibility;
  backgroundImageUrl: string | null;
}

function normalizeCategory(category: RawCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    characterId: category.characterId,
  };
}
