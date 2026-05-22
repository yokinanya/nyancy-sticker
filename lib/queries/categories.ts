import { unstable_cache } from "next/cache";
import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import type { Category } from "@/lib/types";

export const CATEGORY_TREE_CACHE_TAG = "category-tree";

export async function listAllCategories(): Promise<Category[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .orderBy(asc(categories.id));
  return rows.map(({ id, name, parentId }) => ({
    id,
    name,
    ...(parentId ? { parentId } : {}),
  }));
}

export const listCachedCategories = unstable_cache(
  listAllCategories,
  ["category-tree"],
  { tags: [CATEGORY_TREE_CACHE_TAG] },
);

export interface CategoryWithCount {
  id: string;
  name: string;
  parentId: string | null;
  count: number;
  createdAt: Date;
  createdByName: string | null;
  createdByLogin: string | null;
}

/**
 * 列出所有分类（含计数 + 创建者）。count 只统计 status='approved' 的贴纸，
 * 分类的计数是直接挂在该分类上的贴纸数。
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const result = await db.execute<{
    id: string;
    name: string;
    parentId: string | null;
    count: number;
    createdAt: Date;
    createdByName: string | null;
    createdByLogin: string | null;
  }>(sql`
    SELECT
      c.id,
      c.name,
      c."parentId",
      COUNT(s.id)::int AS count,
      c."createdAt",
      u.name AS "createdByName",
      u."githubLogin" AS "createdByLogin"
    FROM "category" c
    LEFT JOIN "sticker" s ON s."categoryId" = c.id AND s.status = 'approved'
    LEFT JOIN "user" u ON c."createdById" = u.id
    GROUP BY c.id, c.name, c."parentId", c."createdAt", u.name, u."githubLogin"
    ORDER BY c.id ASC
  `);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    parentId: r.parentId,
    count: Number(r.count),
    createdAt: new Date(r.createdAt),
    createdByName: r.createdByName,
    createdByLogin: r.createdByLogin,
  }));
}
