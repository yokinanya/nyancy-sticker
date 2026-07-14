import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  stickerSimilarityDecisions,
  stickers,
  users,
} from "@/drizzle/schema";
import {
  buildDuplicateGroups,
  findSimilarRowsForSources,
  similarityPairKey,
  type DuplicateGroup,
  type SimilarityCandidateRow,
  type SimilarityRow,
  type SimilaritySource,
  type SimilarSticker,
} from "@/lib/similarity-groups";
import { assertVisualHashV2 } from "@/lib/visual-hash";

const ACTIVE_STATUSES = ["approved", "pending"] as const;
export const SIMILAR_STICKERS_CACHE_TAG = "similar-stickers";

export async function findSimilarStickersForSources(
  sources: readonly {
    readonly id: string;
    readonly characterId: string;
    readonly visualHashV2: string | null;
  }[],
): Promise<Map<string, SimilarSticker[]>> {
  if (sources.length === 0) return new Map();
  const characterIds = [...new Set(sources.map((source) => source.characterId))].sort();
  const [candidateGroups, ignoredRows] = await Promise.all([
    Promise.all(characterIds.map(loadCachedCandidatesByCharacter)),
    listCachedIgnoredPairRows(),
  ]);
  const checkedSources = sources.map(checkedSource);
  return findSimilarRowsForSources(checkedSources, candidateGroups.flat(), {
    ignoredPairs: toIgnoredPairKeys(ignoredRows),
  });
}

export async function listDuplicateGroups(): Promise<DuplicateGroup[]> {
  "use cache";
  cacheLife("max");
  cacheTag(SIMILAR_STICKERS_CACHE_TAG);
  const [rows, ignoredRows] = await Promise.all([
    loadActiveSimilarityRows(),
    queryIgnoredPairRows(),
  ]);
  return buildDuplicateGroups(rows, {
    ignoredPairs: toIgnoredPairKeys(ignoredRows),
  });
}

async function loadCachedCandidatesByCharacter(
  characterId: string,
): Promise<SimilarityCandidateRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag(SIMILAR_STICKERS_CACHE_TAG);
  const rows = await db
    .select({
      id: stickers.id,
      characterId: categories.characterId,
      name: stickers.name,
      previewSrc: stickers.previewSrc,
      status: stickers.status,
      visualHashV2: stickers.visualHashV2,
    })
    .from(stickers)
    .innerJoin(categories, eq(stickers.categoryId, categories.id))
    .where(
      and(
        inArray(stickers.status, ACTIVE_STATUSES),
        eq(categories.characterId, characterId),
      ),
    );
  return rows.map(requireCandidateRow);
}

async function listCachedIgnoredPairRows(): Promise<IgnoredPairRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag(SIMILAR_STICKERS_CACHE_TAG);
  return queryIgnoredPairRows();
}

async function queryIgnoredPairRows(): Promise<IgnoredPairRow[]> {
  return db
    .select({
      leftStickerId: stickerSimilarityDecisions.leftStickerId,
      rightStickerId: stickerSimilarityDecisions.rightStickerId,
    })
    .from(stickerSimilarityDecisions)
    .where(eq(stickerSimilarityDecisions.decision, "keep_both"));
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
  readonly id: string;
  readonly characterId: string;
  readonly visualHashV2: string | null;
}): SimilaritySource {
  if (!source.visualHashV2) throw missingVisualHashError([source.id]);
  assertVisualHashV2(source.visualHashV2, `贴纸 ${source.id} visualHashV2`);
  return { ...source, visualHashV2: source.visualHashV2 };
}

function requireCandidateRow(row: CandidateRowQuery): SimilarityCandidateRow {
  const common = requireActiveFields(row);
  return {
    id: row.id,
    characterId: row.characterId,
    name: row.name,
    previewSrc: common.previewSrc,
    status: common.status,
    visualHashV2: common.visualHashV2,
  };
}

function requireSimilarityRow(row: SimilarityRowQuery): SimilarityRow {
  const common = requireActiveFields(row);
  return { ...row, ...common };
}

function requireActiveFields(row: CandidateRowQuery) {
  if (row.status === "rejected") {
    throw new Error(`rejected 贴纸不应参与相似度检查：${row.id}`);
  }
  if (!row.previewSrc) {
    throw new Error(`贴纸缺少 previewSrc：${row.id}，请先运行 pnpm db:backfill-previews。`);
  }
  if (!row.visualHashV2) throw missingVisualHashError([row.id]);
  assertVisualHashV2(row.visualHashV2, `贴纸 ${row.id} visualHashV2`);
  return {
    previewSrc: row.previewSrc,
    status: row.status,
    visualHashV2: row.visualHashV2,
  } as const;
}

function toIgnoredPairKeys(rows: readonly IgnoredPairRow[]): ReadonlySet<string> {
  return new Set(
    rows.map((row) => similarityPairKey(row.leftStickerId, row.rightStickerId)),
  );
}

function missingVisualHashError(ids: readonly string[]): Error {
  return new Error(
    `active 贴纸缺少 visualHashV2，请先运行 pnpm db:backfill-visual-hashes。缺失示例：${ids.join(", ")}`,
  );
}

interface IgnoredPairRow {
  readonly leftStickerId: string;
  readonly rightStickerId: string;
}

type CandidateRowQuery = Omit<
  SimilarityCandidateRow,
  "previewSrc" | "status" | "visualHashV2"
> & {
  readonly previewSrc: string | null;
  readonly status: "approved" | "pending" | "rejected";
  readonly visualHashV2: string | null;
};

type SimilarityRowQuery = Omit<
  SimilarityRow,
  "previewSrc" | "status" | "visualHashV2"
> & CandidateRowQuery;
