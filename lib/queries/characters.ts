import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CATEGORY_TREE_CACHE_TAG } from "./categories";
import type { CharacterVisibility } from "@/lib/types";

export const CHARACTER_LIST_CACHE_TAG = "character-list";

export interface CharacterSummary {
  id: string;
  name: string;
  visibility: CharacterVisibility;
  backgroundImageUrl: string | null;
  sortOrder: number;
  count: number;
}

/**
 * 列出所有角色，含每个角色下 approved 贴纸数量
 * （该角色直属贴纸 + 该角色分类下贴纸的合计）。
 */
export async function listCharactersWithCounts(): Promise<CharacterSummary[]> {
  return listCharactersWithCountsByVisibility("public");
}

export async function listStaffVisibleCharactersWithCounts(): Promise<CharacterSummary[]> {
  return listCharactersWithCountsByVisibility("staff");
}

export async function listAllCharactersWithCounts(): Promise<CharacterSummary[]> {
  return listCharactersWithCountsByVisibility("all");
}

async function listCharactersWithCountsByVisibility(
  visibility: "public" | "staff" | "all",
): Promise<CharacterSummary[]> {
  const result = await db.execute<{
    id: string;
    name: string;
    visibility: CharacterVisibility;
    backgroundImageUrl: string | null;
    sortOrder: number;
    count: number;
  }>(sql`
    SELECT ch.id, ch.name, ch.visibility, ch."backgroundImageUrl", ch."sortOrder", COUNT(s.id)::int AS count
    FROM "character" ch
    LEFT JOIN "category" c ON c."characterId" = ch.id
    LEFT JOIN "sticker" s ON s."categoryId" = c.id AND s.status = 'approved'
    WHERE ${visibility === "all"}
      OR ch.visibility = 'public'
      OR (${visibility === "staff"} AND ch.visibility = 'admin_only')
    GROUP BY ch.id, ch.name, ch.visibility, ch."backgroundImageUrl", ch."sortOrder"
    ORDER BY ch."sortOrder" ASC, ch.id ASC
  `);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    visibility: r.visibility,
    backgroundImageUrl: r.backgroundImageUrl,
    sortOrder: Number(r.sortOrder),
    count: Number(r.count),
  }));
}

export const listCachedCharactersWithCounts = unstable_cache(
  listCharactersWithCounts,
  ["character-list-with-counts"],
  { tags: [CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG] },
);

export const listCachedAllCharactersWithCounts = unstable_cache(
  listAllCharactersWithCounts,
  ["all-character-list-with-counts"],
  { tags: [CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG] },
);

export const listCachedStaffVisibleCharactersWithCounts = unstable_cache(
  listStaffVisibleCharactersWithCounts,
  ["staff-visible-character-list-with-counts"],
  { tags: [CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG] },
);

export async function findCharacter(
  id: string,
): Promise<{ id: string; name: string; sortOrder: number; visibility: CharacterVisibility } | null> {
  const result = await db.execute<{
    id: string;
    name: string;
    sortOrder: number;
    visibility: CharacterVisibility;
    backgroundImageUrl: string | null;
  }>(sql`
    SELECT id, name, "sortOrder", visibility, "backgroundImageUrl" FROM "character" WHERE id = ${id} LIMIT 1
  `);
  return result.rows[0] ?? null;
}
