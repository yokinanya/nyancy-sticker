import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
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
  sort?: "newest" | "oldest" | "name";
}

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
    conditions.push(or(ilike(stickers.name, like), ilike(stickers.id, like))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = Math.max(0, (opts.page - 1) * opts.pageSize);

  const orderBy =
    opts.sort === "oldest"
      ? [asc(stickers.submittedAt)]
      : opts.sort === "name"
        ? [asc(stickers.name)]
        : [desc(stickers.submittedAt)];

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
