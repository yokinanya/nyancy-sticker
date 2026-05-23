import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { stickerSimilarityDecisions, stickers, users } from "@/drizzle/schema";
import {
  buildDuplicateGroups,
  findSimilarRows,
  similarityPairKey,
  type DuplicateGroup,
  type SimilarityRow,
  type SimilaritySource,
  type SimilarSticker,
} from "@/lib/similarity-groups";
import { assertVisualHash } from "@/lib/visual-hash";

const ACTIVE_STATUSES = ["approved", "pending"] as const;

export async function assertActiveVisualHashesComplete(): Promise<void> {
  const missing = await db
    .select({ id: stickers.id })
    .from(stickers)
    .where(and(inArray(stickers.status, ACTIVE_STATUSES), isNull(stickers.visualHash)))
    .orderBy(asc(stickers.id))
    .limit(5);
  if (missing.length > 0) throw missingVisualHashError(missing.map((row) => row.id));
}

export async function findSimilarStickers(source: SimilaritySource): Promise<SimilarSticker[]> {
  assertVisualHash(source.visualHash);
  const [rows, ignoredPairs] = await Promise.all([
    loadActiveSimilarityRows(),
    loadIgnoredPairKeys(),
  ]);
  return findSimilarRows(source, rows, { ignoredPairs });
}

export async function findSimilarStickersForSources(
  sources: readonly { id: string; visualHash: string | null }[],
): Promise<Map<string, SimilarSticker[]>> {
  const [rows, ignoredPairs] = await Promise.all([
    loadActiveSimilarityRows(),
    loadIgnoredPairKeys(),
  ]);
  return new Map(
    sources.map((source) => {
      const checked = checkedSource(source);
      return [checked.id, findSimilarRows(checked, rows, { ignoredPairs })];
    }),
  );
}

export async function listDuplicateGroups(): Promise<DuplicateGroup[]> {
  const [rows, ignoredPairs] = await Promise.all([
    loadActiveSimilarityRows(),
    loadIgnoredPairKeys(),
  ]);
  return buildDuplicateGroups(rows, { ignoredPairs });
}

async function loadIgnoredPairKeys(): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({
      leftStickerId: stickerSimilarityDecisions.leftStickerId,
      rightStickerId: stickerSimilarityDecisions.rightStickerId,
    })
    .from(stickerSimilarityDecisions)
    .where(eq(stickerSimilarityDecisions.decision, "keep_both"));
  return new Set(rows.map((row) => similarityPairKey(row.leftStickerId, row.rightStickerId)));
}

async function loadActiveSimilarityRows(): Promise<SimilarityRow[]> {
  const rows = await db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      previewSrc: stickers.previewSrc,
      width: stickers.width,
      height: stickers.height,
      categoryId: stickers.categoryId,
      tags: stickers.tags,
      status: stickers.status,
      submitterLogin: users.githubLogin,
      submittedAt: stickers.submittedAt,
      visualHash: stickers.visualHash,
    })
    .from(stickers)
    .leftJoin(users, eq(stickers.submittedById, users.id))
    .where(inArray(stickers.status, ACTIVE_STATUSES))
    .orderBy(asc(stickers.id));
  return rows.map(requireSimilarityRow);
}

function checkedSource(source: { id: string; visualHash: string | null }): SimilaritySource {
  if (!source.visualHash) throw missingVisualHashError([source.id]);
  assertVisualHash(source.visualHash, `贴纸 ${source.id} visualHash`);
  return { id: source.id, visualHash: source.visualHash };
}

function requireSimilarityRow(row: SimilarityRowQuery): SimilarityRow {
  if (row.status === "rejected") throw new Error(`rejected 贴纸不应参与相似度检查：${row.id}`);
  if (!row.previewSrc) {
    throw new Error(`贴纸缺少 previewSrc：${row.id}，请先运行 pnpm db:backfill-previews。`);
  }
  if (!row.visualHash) throw missingVisualHashError([row.id]);
  assertVisualHash(row.visualHash, `贴纸 ${row.id} visualHash`);
  return { ...row, previewSrc: row.previewSrc, status: row.status, visualHash: row.visualHash };
}

function missingVisualHashError(ids: readonly string[]): Error {
  return new Error(
    `active 贴纸缺少 visualHash，请先运行 pnpm db:backfill-visual-hashes。缺失示例：${ids.join(", ")}`,
  );
}

type SimilarityRowQuery = Omit<SimilarityRow, "previewSrc" | "status" | "visualHash"> & {
  previewSrc: string | null;
  status: "approved" | "pending" | "rejected";
  visualHash: string | null;
};
