import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

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
    SELECT c.id, c.name, COUNT(s.id)::int AS count
    FROM "category" c
    LEFT JOIN "category" sub ON sub."parentId" = c.id
    LEFT JOIN "sticker" s
      ON (s."categoryId" = c.id OR s."categoryId" = sub.id)
      AND s.status = 'approved'
    WHERE c."parentId" IS NULL
    GROUP BY c.id, c.name
    ORDER BY c.id ASC
  `);
  return result.rows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) }));
}

export async function findCharacter(id: string): Promise<{ id: string; name: string } | null> {
  const result = await db.execute<{ id: string; name: string }>(sql`
    SELECT id, name FROM "category" WHERE id = ${id} AND "parentId" IS NULL LIMIT 1
  `);
  return result.rows[0] ?? null;
}
