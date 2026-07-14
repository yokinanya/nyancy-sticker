import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { CATEGORY_TREE_CACHE_TAG } from "./categories";
import type {
  CharacterRef,
  CharacterVisibility,
} from "@/lib/types";

export const CHARACTER_LIST_CACHE_TAG = "character-list";
export const CHARACTER_DATA_CACHE_TAG = "character-data";

export interface CharacterAccess extends CharacterRef, Record<string, unknown> {
  readonly visibility: CharacterVisibility;
}

export interface CharacterSummary extends CharacterAccess {
  readonly backgroundImageUrl: string | null;
  readonly sortOrder: number;
  readonly count: number;
}

type VisibilityScope = "public" | "staff" | "all";

export async function listCachedCharactersWithCounts() {
  "use cache";
  cacheLife("max");
  cacheTag(CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG);
  return listCharactersWithCounts("public");
}

export async function listCachedStaffVisibleCharactersWithCounts() {
  "use cache";
  cacheLife("max");
  cacheTag(CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG);
  return listCharactersWithCounts("staff");
}

export async function listCachedAllCharactersWithCounts() {
  "use cache";
  cacheLife("max");
  cacheTag(CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG);
  return listCharactersWithCounts("all");
}

export async function listCachedCharacterAccessRows(): Promise<CharacterAccess[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CHARACTER_DATA_CACHE_TAG);
  const result = await db.execute<CharacterAccess>(sql`
    SELECT id, name, visibility
    FROM "character"
    ORDER BY "sortOrder" ASC, id ASC
  `);
  return result.rows;
}

export async function findCachedCharacterAccess(
  id: string,
): Promise<CharacterAccess | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CHARACTER_DATA_CACHE_TAG, characterCacheTag(id));
  const result = await db.execute<CharacterAccess>(sql`
    SELECT id, name, visibility
    FROM "character"
    WHERE id = ${id}
    LIMIT 1
  `);
  return result.rows[0] ?? null;
}

export function characterCacheTag(id: string): string {
  return `character:${id}`;
}

async function listCharactersWithCounts(
  visibility: VisibilityScope,
): Promise<CharacterSummary[]> {
  const result = await db.execute<CharacterSummary>(sql`
    SELECT ch.id, ch.name, ch.visibility, ch."backgroundImageUrl", ch."sortOrder",
      COUNT(s.id)::int AS count
    FROM "character" ch
    LEFT JOIN "category" c ON c."characterId" = ch.id
    LEFT JOIN "sticker" s ON s."categoryId" = c.id AND s.status = 'approved'
    WHERE ${visibility === "all"}
      OR ch.visibility = 'public'
      OR (${visibility === "staff"} AND ch.visibility = 'admin_only')
    GROUP BY ch.id, ch.name, ch.visibility, ch."backgroundImageUrl", ch."sortOrder"
    ORDER BY ch."sortOrder" ASC, ch.id ASC
  `);
  return result.rows.map(normalizeSummary);
}

function normalizeSummary(row: CharacterSummary): CharacterSummary {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    backgroundImageUrl: row.backgroundImageUrl,
    sortOrder: Number(row.sortOrder),
    count: Number(row.count),
  };
}
