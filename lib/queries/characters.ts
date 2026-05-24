import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CATEGORY_TREE_CACHE_TAG } from "./categories";

export const CHARACTER_LIST_CACHE_TAG = "character-list";

export interface CharacterSummary {
  id: string;
  name: string;
  count: number;
}

/**
 * 列出所有角色，含每个角色下 approved 贴纸数量
 * （该角色直属贴纸 + 该角色分类下贴纸的合计）。
 */
export async function listCharactersWithCounts(): Promise<CharacterSummary[]> {
  const result = await db.execute<{ id: string; name: string; count: number }>(sql`
    SELECT ch.id, ch.name, COUNT(s.id)::int AS count
    FROM "character" ch
    LEFT JOIN "category" c ON c."characterId" = ch.id
    LEFT JOIN "sticker" s ON s."categoryId" = c.id AND s.status = 'approved'
    GROUP BY ch.id, ch.name
    ORDER BY ch.id ASC
  `);
  return result.rows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) }));
}

export const listCachedCharactersWithCounts = unstable_cache(
  listCharactersWithCounts,
  ["character-list-with-counts"],
  { tags: [CHARACTER_LIST_CACHE_TAG, CATEGORY_TREE_CACHE_TAG] },
);

export async function findCharacter(id: string): Promise<{ id: string; name: string } | null> {
  const result = await db.execute<{ id: string; name: string }>(sql`
    SELECT id, name FROM "character" WHERE id = ${id} LIMIT 1
  `);
  return result.rows[0] ?? null;
}
