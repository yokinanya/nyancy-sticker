import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export interface TagSummary {
  tag: string;
  count: number;
}

/** 列出所有 approved 贴纸里出现过的 tag 及计数。 */
export async function listTagsWithCounts(): Promise<TagSummary[]> {
  const result = await db.execute<{ tag: string; count: number }>(sql`
    SELECT t AS tag, COUNT(*)::int AS count
    FROM "sticker" s, unnest(s.tags) AS t
    WHERE s.status = 'approved'
    GROUP BY t
    ORDER BY count DESC, t ASC
  `);
  return result.rows.map((r) => ({ tag: r.tag, count: Number(r.count) }));
}
