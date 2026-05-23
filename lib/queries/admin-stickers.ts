import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { categories, stickers, users } from "@/drizzle/schema";

export type StickerStatus = "approved" | "pending" | "rejected";

export interface AdminStickerRow {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  ext: "png" | "gif" | "webp" | "jpg" | "jpeg";
  hash: string;
  categoryId: string;
  tags: string[];
  status: StickerStatus;
  submittedAt: Date;
  approvedAt: Date | null;
  submitterName: string | null;
  submitterLogin: string | null;
}

export interface ListOptions {
  status?: StickerStatus;
  characterId?: string;
  categoryId?: string;
  tag?: string;
  q?: string;
  page: number;
  pageSize: number;
  sort?: StickerSort;
}

export type StickerSort =
  | "grouped"
  | "newest"
  | "oldest"
  | "name"
  | "name-desc"
  | "category"
  | "category-desc"
  | "status"
  | "status-desc"
  | "submitter"
  | "submitter-desc";

export interface ListResult {
  items: AdminStickerRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function listStickersPaginated(opts: ListOptions): Promise<ListResult> {
  const conditions = [];
  if (opts.status) conditions.push(eq(stickers.status, opts.status));
  if (opts.categoryId) {
    conditions.push(eq(stickers.categoryId, opts.categoryId));
  } else if (opts.characterId) {
    const subRows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, opts.characterId));
    const ids = [opts.characterId, ...subRows.map((r) => r.id)];
    conditions.push(inArray(stickers.categoryId, ids));
  }
  if (opts.tag) {
    conditions.push(sql`${opts.tag} = ANY(${stickers.tags})`);
  }
  if (opts.q) {
    const like = `%${opts.q}%`;
    conditions.push(
      or(
        ilike(stickers.name, like),
        ilike(stickers.id, like),
        sql`EXISTS (SELECT 1 FROM unnest(${stickers.tags}) AS tag WHERE tag ILIKE ${like})`,
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = Math.max(0, (opts.page - 1) * opts.pageSize);

  const orderBy = buildOrderBy(opts.sort);

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: stickers.id,
        name: stickers.name,
        src: stickers.src,
        width: stickers.width,
        height: stickers.height,
        ext: stickers.ext,
        hash: stickers.hash,
        categoryId: stickers.categoryId,
        tags: stickers.tags,
        status: stickers.status,
        submittedAt: stickers.submittedAt,
        approvedAt: stickers.approvedAt,
        submitterName: users.name,
        submitterLogin: users.githubLogin,
      })
      .from(stickers)
      .leftJoin(categories, eq(stickers.categoryId, categories.id))
      .leftJoin(parentCategories, eq(categories.parentId, parentCategories.id))
      .leftJoin(users, eq(stickers.submittedById, users.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(opts.pageSize)
      .offset(offset),
    db.select({ c: count() }).from(stickers).where(where),
  ]);

  const total = Number(totalRows[0]?.c ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / opts.pageSize));
  return { items, total, page: opts.page, pageSize: opts.pageSize, pageCount };
}

const parentCategories = alias(categories, "parent_category");

function buildOrderBy(sort: ListOptions["sort"]) {
  if (sort === "oldest") return [asc(stickers.submittedAt)];
  if (sort === "name") return [asc(stickers.name)];
  if (sort === "name-desc") return [desc(stickers.name)];
  if (sort === "category") return [asc(stickers.categoryId), desc(stickers.submittedAt)];
  if (sort === "category-desc") return [desc(stickers.categoryId), desc(stickers.submittedAt)];
  if (sort === "status") return [asc(stickers.status), desc(stickers.submittedAt)];
  if (sort === "status-desc") return [desc(stickers.status), desc(stickers.submittedAt)];
  if (sort === "submitter") return [asc(users.githubLogin), asc(users.name)];
  if (sort === "submitter-desc") return [desc(users.githubLogin), desc(users.name)];
  if (sort === "newest") return [desc(stickers.submittedAt)];
  return [
    asc(sql`COALESCE(${parentCategories.id}, ${categories.id})`),
    asc(stickers.categoryId),
    desc(stickers.submittedAt),
  ];
}

export async function countByStatus(): Promise<Record<StickerStatus, number>> {
  const rows = await db
    .select({ status: stickers.status, c: count() })
    .from(stickers)
    .groupBy(stickers.status);
  const result: Record<StickerStatus, number> = { approved: 0, pending: 0, rejected: 0 };
  rows.forEach((r) => {
    result[r.status] = Number(r.c);
  });
  return result;
}
