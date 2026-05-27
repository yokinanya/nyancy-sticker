import { unstable_cache } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, characters } from "@/drizzle/schema";
import type { Category, CharacterVisibility } from "@/lib/types";

export const CATEGORY_TREE_CACHE_TAG = "category-tree";

export async function listAllCategories(): Promise<Category[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
      characterId: categories.characterId,
    })
    .from(categories)
    .innerJoin(characters, eq(categories.characterId, characters.id))
    .orderBy(
      asc(characters.sortOrder),
      asc(categories.characterId),
      asc(categories.sortOrder),
      asc(categories.slug),
    );
  return rows.map(({ id, name, slug, sortOrder, characterId }) => ({
    id,
    name,
    slug,
    sortOrder,
    characterId,
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
  slug: string;
  sortOrder: number;
  characterId: string;
  characterName: string;
  count: number;
  createdAt: Date;
  createdByName: string | null;
  createdByLogin: string | null;
}

export interface CharacterWithCount {
  id: string;
  name: string;
  visibility: CharacterVisibility;
  backgroundImageUrl: string | null;
  sortOrder: number;
  count: number;
  createdAt: Date;
  createdByName: string | null;
  createdByLogin: string | null;
}

export async function listCharactersForCategoryManager(): Promise<CharacterWithCount[]> {
  const result = await db.execute<{
    id: string;
    name: string;
    visibility: CharacterVisibility;
    backgroundImageUrl: string | null;
    sortOrder: number;
    count: number;
    createdAt: Date;
    createdByName: string | null;
    createdByLogin: string | null;
  }>(sql`
    SELECT
      ch.id,
      ch.name,
      ch.visibility,
      ch."backgroundImageUrl",
      ch."sortOrder",
      COUNT(s.id)::int AS count,
      ch."createdAt",
      u.name AS "createdByName",
      u."githubLogin" AS "createdByLogin"
    FROM "character" ch
    LEFT JOIN "category" c ON c."characterId" = ch.id
    LEFT JOIN "sticker" s ON s."categoryId" = c.id AND s.status = 'approved'
    LEFT JOIN "user" u ON ch."createdById" = u.id
    GROUP BY ch.id, ch.name, ch.visibility, ch."backgroundImageUrl", ch."sortOrder", ch."createdAt", u.name, u."githubLogin"
    ORDER BY ch."sortOrder" ASC, ch.id ASC
  `);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    visibility: r.visibility,
    backgroundImageUrl: r.backgroundImageUrl,
    sortOrder: Number(r.sortOrder),
    count: Number(r.count),
    createdAt: new Date(r.createdAt),
    createdByName: r.createdByName,
    createdByLogin: r.createdByLogin,
  }));
}

/**
 * 列出所有分类（含计数 + 创建者）。count 只统计 status='approved' 的贴纸，
 * 分类的计数是直接挂在该分类上的贴纸数。
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const result = await db.execute<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    characterId: string;
    characterName: string;
    count: number;
    createdAt: Date;
    createdByName: string | null;
    createdByLogin: string | null;
  }>(sql`
    SELECT
      c.id,
      c.name,
      c.slug,
      c."sortOrder",
      c."characterId",
      ch.name AS "characterName",
      COUNT(s.id)::int AS count,
      c."createdAt",
      u.name AS "createdByName",
      u."githubLogin" AS "createdByLogin"
    FROM "category" c
    INNER JOIN "character" ch ON c."characterId" = ch.id
    LEFT JOIN "sticker" s ON s."categoryId" = c.id AND s.status = 'approved'
    LEFT JOIN "user" u ON c."createdById" = u.id
    GROUP BY c.id, c.name, c.slug, c."sortOrder", c."characterId", ch.name, ch."sortOrder", c."createdAt", u.name, u."githubLogin"
    ORDER BY ch."sortOrder" ASC, c."characterId" ASC, c."sortOrder" ASC, c.slug ASC
  `);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sortOrder: Number(r.sortOrder),
    characterId: r.characterId,
    characterName: r.characterName,
    count: Number(r.count),
    createdAt: new Date(r.createdAt),
    createdByName: r.createdByName,
    createdByLogin: r.createdByLogin,
  }));
}
