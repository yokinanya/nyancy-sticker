import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { Category, Manifest, Sticker } from "@/lib/types";

export const CHARACTER_GALLERY_CACHE_TAG = "character-gallery";

export async function listCachedCharacterGallery(
  characterId: string,
): Promise<Manifest> {
  "use cache";
  cacheLife("max");
  cacheTag(
    CHARACTER_GALLERY_CACHE_TAG,
    characterGalleryCacheTag(characterId),
  );

  const row = await queryCharacterGallery(characterId);
  return {
    categories: row.categories.map(normalizeCategory),
    stickers: row.stickers.map(requirePreviewSrc),
  };
}

async function queryCharacterGallery(characterId: string): Promise<CharacterGalleryRow> {
  const result = await db.execute<CharacterGalleryRow>(sql`
    WITH selected_categories AS (
      SELECT id, name, slug, "sortOrder", "characterId"
      FROM "category"
      WHERE "characterId" = ${characterId}
    )
    SELECT
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', id,
              'name', name,
              'slug', slug,
              'sortOrder', "sortOrder",
              'characterId', "characterId"
            ) ORDER BY "sortOrder" ASC, slug ASC
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
              'ext', s.ext,
              'submittedAt', s."submittedAt"
            ) ORDER BY s.id ASC
          )
          FROM "sticker" s
          WHERE s.status = 'approved'
            AND s."categoryId" IN (SELECT id FROM selected_categories)
        ),
        '[]'::jsonb
      ) AS stickers
  `);
  return result.rows[0] ?? { categories: [], stickers: [] };
}

export function characterGalleryCacheTag(characterId: string): string {
  return `gallery:${characterId}`;
}

type QueriedSticker = Omit<Sticker, "previewSrc" | "submittedAt"> & {
  readonly previewSrc: string | null;
  readonly submittedAt: Date | string;
};

interface CharacterGalleryRow extends Record<string, unknown> {
  readonly categories: RawCategory[];
  readonly stickers: QueriedSticker[];
}

interface RawCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly sortOrder: number;
  readonly characterId: string;
}

function requirePreviewSrc(sticker: QueriedSticker): Sticker {
  if (!sticker.previewSrc) {
    throw new Error(
      `贴纸缺少 previewSrc：${sticker.id}，请先运行 pnpm db:backfill-previews。`,
    );
  }
  return {
    ...sticker,
    previewSrc: sticker.previewSrc,
    submittedAt: normalizeSubmittedAt(sticker.submittedAt),
  };
}

function normalizeSubmittedAt(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeCategory(category: RawCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: Number(category.sortOrder),
    characterId: category.characterId,
  };
}
