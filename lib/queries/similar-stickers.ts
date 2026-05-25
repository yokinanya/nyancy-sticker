import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickerSimilarityDecisions, stickers, users } from "@/drizzle/schema";
import {
  buildDuplicateGroups,
  findSimilarRows,
  similarityPairKey,
  type DuplicateGroup,
  type SimilarityRow,
  type SimilaritySource,
  type SimilarSticker,
} from "@/lib/similarity-groups";
import { assertVisualHashV2 } from "@/lib/visual-hash";

const ACTIVE_STATUSES = ["approved", "pending"] as const;

export async function assertActiveVisualHashesComplete(): Promise<void> {
  const missing = await db
    .select({ id: stickers.id })
    .from(stickers)
    .where(and(inArray(stickers.status, ACTIVE_STATUSES), isNull(stickers.visualHashV2)))
    .orderBy(asc(stickers.id))
    .limit(5);
  if (missing.length > 0) throw missingVisualHashError(missing.map((row) => row.id));
}

export async function findSimilarStickers(source: SimilaritySource): Promise<SimilarSticker[]> {
  assertVisualHashV2(source.visualHashV2);
  const [rows, ignoredPairs] = await Promise.all([
    loadActiveSimilarityRows(),
    loadIgnoredPairKeys(),
  ]);
  return findSimilarRows(source, rows, { ignoredPairs });
}

export async function findSimilarStickersForSources(
  sources: readonly { id: string; characterId: string; visualHashV2: string | null }[],
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
      characterId: categories.characterId,
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
      visualHashV2: stickers.visualHashV2,
    })
    .from(stickers)
    .innerJoin(categories, eq(stickers.categoryId, categories.id))
    .leftJoin(users, eq(stickers.submittedById, users.id))
    .where(inArray(stickers.status, ACTIVE_STATUSES))
    .orderBy(asc(stickers.id));
  return rows.map(requireSimilarityRow);
}

function checkedSource(source: {
  id: string;
  characterId: string;
  visualHashV2: string | null;
}): SimilaritySource {
  if (!source.visualHashV2) throw missingVisualHashError([source.id]);
  assertVisualHashV2(source.visualHashV2, `贴纸 ${source.id} visualHashV2`);
  return { id: source.id, characterId: source.characterId, visualHashV2: source.visualHashV2 };
}

function requireSimilarityRow(row: SimilarityRowQuery): SimilarityRow {
  if (row.status === "rejected") throw new Error(`rejected 贴纸不应参与相似度检查：${row.id}`);
  if (!row.previewSrc) {
    throw new Error(`贴纸缺少 previewSrc：${row.id}，请先运行 pnpm db:backfill-previews。`);
  }
  if (!row.visualHashV2) throw missingVisualHashError([row.id]);
  assertVisualHashV2(row.visualHashV2, `贴纸 ${row.id} visualHashV2`);
  return { ...row, previewSrc: row.previewSrc, status: row.status, visualHashV2: row.visualHashV2 };
}

function missingVisualHashError(ids: readonly string[]): Error {
  return new Error(
    `active 贴纸缺少 visualHashV2，请先运行 pnpm db:backfill-visual-hashes。缺失示例：${ids.join(", ")}`,
  );
}

type SimilarityRowQuery = Omit<SimilarityRow, "previewSrc" | "status" | "visualHashV2"> & {
  previewSrc: string | null;
  status: "approved" | "pending" | "rejected";
  visualHashV2: string | null;
};
