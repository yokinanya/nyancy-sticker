import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, characters, stickers, users } from "@/drizzle/schema";
import type { AdminStickerListItem } from "@/lib/types";

export type StickerStatus = "approved" | "pending" | "rejected";

export type AdminStickerRow = AdminStickerListItem;

export interface ListOptions {
  status?: StickerStatus;
  characterId?: string;
  categoryId?: string;
  tag?: string;
  q?: string;
  submitter?: string;
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
  const where = buildWhere(opts);
  const offset = Math.max(0, (opts.page - 1) * opts.pageSize);
  const orderBy = buildOrderBy(opts.sort);

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: stickers.id,
        name: stickers.name,
        previewSrc: stickers.previewSrc,
        width: stickers.width,
        height: stickers.height,
        ext: stickers.ext,
        categoryId: stickers.categoryId,
        tags: stickers.tags,
        status: stickers.status,
        submittedAt: stickers.submittedAt,
        submitterName: users.name,
        submitterLogin: users.githubLogin,
      })
      .from(stickers)
      .leftJoin(categories, eq(stickers.categoryId, categories.id))
      .leftJoin(characters, eq(categories.characterId, characters.id))
      .leftJoin(users, eq(stickers.submittedById, users.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(opts.pageSize)
      .offset(offset),
    buildCountQuery(opts, where),
  ]);

  const total = Number(totalRows[0]?.c ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / opts.pageSize));
  return {
    items: items.map(requirePreviewSrc),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
    pageCount,
  };
}

function buildWhere(opts: ListOptions) {
  const conditions: SQL[] = [];
  if (opts.status) conditions.push(eq(stickers.status, opts.status));
  addCategoryCondition(conditions, opts);
  if (opts.tag) conditions.push(sql`${opts.tag} = ANY(${stickers.tags})`);
  if (opts.q) conditions.push(buildTextSearchCondition(opts.q));
  if (opts.submitter) conditions.push(buildSubmitterCondition(opts.submitter));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function addCategoryCondition(conditions: SQL[], opts: ListOptions) {
  if (opts.categoryId) {
    conditions.push(eq(stickers.categoryId, opts.categoryId));
    return;
  }
  if (!opts.characterId) return;
  conditions.push(eq(categories.characterId, opts.characterId));
}

function buildCountQuery(opts: ListOptions, where: SQL | undefined) {
  const base = db.select({ c: count() }).from(stickers).$dynamic();
  let query: typeof base = base;
  if (opts.characterId) {
    query = query.innerJoin(categories, eq(stickers.categoryId, categories.id));
  }
  if (opts.submitter) {
    query = query.leftJoin(users, eq(stickers.submittedById, users.id));
  }
  return query.where(where);
}

function buildTextSearchCondition(text: string) {
  const like = `%${text}%`;
  return or(
    ilike(stickers.name, like),
    ilike(stickers.id, like),
    sql`EXISTS (SELECT 1 FROM unnest(${stickers.tags}) AS tag WHERE tag ILIKE ${like})`,
  )!;
}

function buildSubmitterCondition(text: string) {
  const like = `%${text}%`;
  return or(
    eq(stickers.submittedById, text),
    ilike(users.githubLogin, like),
    ilike(users.name, like),
  )!;
}

function buildOrderBy(sort: ListOptions["sort"]) {
  if (sort === "category") return [
    asc(characters.sortOrder),
    asc(categories.sortOrder),
    asc(categories.slug),
    desc(stickers.submittedAt),
  ];
  if (sort === "category-desc") return [
    desc(characters.sortOrder),
    desc(categories.sortOrder),
    desc(categories.slug),
    desc(stickers.submittedAt),
  ];
  const simpleOrder = SIMPLE_ORDER_BY[sort ?? "grouped"];
  if (simpleOrder) return simpleOrder();
  return [
    asc(characters.sortOrder),
    asc(categories.characterId),
    asc(categories.sortOrder),
    asc(categories.slug),
    desc(stickers.submittedAt),
  ];
}

const SIMPLE_ORDER_BY: Readonly<Partial<Record<StickerSort, () => SQL[]>>> = {
  oldest: () => [asc(stickers.submittedAt)],
  name: () => [asc(stickers.name)],
  "name-desc": () => [desc(stickers.name)],
  status: () => [asc(stickers.status), desc(stickers.submittedAt)],
  "status-desc": () => [desc(stickers.status), desc(stickers.submittedAt)],
  submitter: () => [asc(users.githubLogin), asc(users.name)],
  "submitter-desc": () => [desc(users.githubLogin), desc(users.name)],
  newest: () => [desc(stickers.submittedAt)],
};

export async function countPendingStickers(): Promise<number> {
  const rows = await db
    .select({ c: count() })
    .from(stickers)
    .where(eq(stickers.status, "pending"));
  return Number(rows[0]?.c ?? 0);
}

type QueriedAdminStickerRow = Omit<AdminStickerRow, "previewSrc" | "submittedAt"> & {
  previewSrc: string | null;
  submittedAt: Date;
};

function requirePreviewSrc(row: QueriedAdminStickerRow): AdminStickerRow {
  if (!row.previewSrc) {
    throw new Error(`贴纸缺少 previewSrc：${row.id}，请先运行 pnpm db:backfill-previews。`);
  }
  return {
    ...row,
    previewSrc: row.previewSrc,
    submittedAt: row.submittedAt.toISOString(),
  };
}
