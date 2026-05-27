import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, characters, stickers, users } from "@/drizzle/schema";

export type StickerStatus = "approved" | "pending" | "rejected";

export interface AdminStickerRow {
  id: string;
  name: string;
  src: string;
  previewSrc: string;
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
  const where = await buildWhere(opts);
  const offset = Math.max(0, (opts.page - 1) * opts.pageSize);
  const orderBy = buildOrderBy(opts.sort);

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: stickers.id,
        name: stickers.name,
        src: stickers.src,
        previewSrc: stickers.previewSrc,
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
      .leftJoin(characters, eq(categories.characterId, characters.id))
      .leftJoin(users, eq(stickers.submittedById, users.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(opts.pageSize)
      .offset(offset),
    db
      .select({ c: count() })
      .from(stickers)
      .leftJoin(categories, eq(stickers.categoryId, categories.id))
      .leftJoin(characters, eq(categories.characterId, characters.id))
      .leftJoin(users, eq(stickers.submittedById, users.id))
      .where(where),
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

async function buildWhere(opts: ListOptions) {
  const conditions: SQL[] = [];
  if (opts.status) conditions.push(eq(stickers.status, opts.status));
  await addCategoryCondition(conditions, opts);
  if (opts.tag) conditions.push(sql`${opts.tag} = ANY(${stickers.tags})`);
  if (opts.q) conditions.push(buildTextSearchCondition(opts.q));
  if (opts.submitter) conditions.push(buildSubmitterCondition(opts.submitter));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function addCategoryCondition(conditions: SQL[], opts: ListOptions) {
  if (opts.categoryId) {
    conditions.push(eq(stickers.categoryId, opts.categoryId));
    return;
  }
  if (!opts.characterId) return;
  const subRows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.characterId, opts.characterId));
  if (subRows.length === 0) {
    conditions.push(sql`false`);
    return;
  }
  conditions.push(inArray(stickers.categoryId, subRows.map((r) => r.id)));
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
  if (sort === "oldest") return [asc(stickers.submittedAt)];
  if (sort === "name") return [asc(stickers.name)];
  if (sort === "name-desc") return [desc(stickers.name)];
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
  if (sort === "status") return [asc(stickers.status), desc(stickers.submittedAt)];
  if (sort === "status-desc") return [desc(stickers.status), desc(stickers.submittedAt)];
  if (sort === "submitter") return [asc(users.githubLogin), asc(users.name)];
  if (sort === "submitter-desc") return [desc(users.githubLogin), desc(users.name)];
  if (sort === "newest") return [desc(stickers.submittedAt)];
  return [
    asc(characters.sortOrder),
    asc(categories.characterId),
    asc(categories.sortOrder),
    asc(categories.slug),
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

type QueriedAdminStickerRow = Omit<AdminStickerRow, "previewSrc"> & {
  previewSrc: string | null;
};

function requirePreviewSrc(row: QueriedAdminStickerRow): AdminStickerRow {
  if (!row.previewSrc) {
    throw new Error(`贴纸缺少 previewSrc：${row.id}，请先运行 pnpm db:backfill-previews。`);
  }
  return { ...row, previewSrc: row.previewSrc };
}
