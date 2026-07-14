import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers, users } from "@/drizzle/schema";
import { listCachedCategories } from "@/lib/queries/categories";
import { listCachedAllCharactersWithCounts } from "@/lib/queries/characters";
import { findSimilarStickersForSources } from "@/lib/queries/similar-stickers";
import { SubmissionList } from "@/app/admin/submissions/submission-list";
import type {
  CharacterRef,
  SimilarCandidate,
  SubmissionReviewItem,
} from "@/lib/types";
import type { SimilarSticker } from "@/lib/similarity-groups";

export async function SubmissionsPanel() {
  const [pending, categories, characters] = await Promise.all([
    listPendingSubmissions(),
    listCachedCategories(),
    listCachedAllCharactersWithCounts(),
  ]);

  if (pending.length === 0) {
    return (
      <p className="rounded-lg border border-default-200 bg-content1 p-6 text-center text-sm text-default-500">
        当前没有待审核投稿。
      </p>
    );
  }

  const similarById = await findSimilarStickersForSources(pending);
  const submissions = pending.map((submission) =>
    toReviewItem(submission, similarById.get(submission.id) ?? []),
  );
  const characterRefs: CharacterRef[] = characters.map(({ id, name }) => ({ id, name }));
  return (
    <SubmissionList
      submissions={submissions}
      categories={categories}
      characters={characterRefs}
    />
  );
}

function listPendingSubmissions() {
  return db
    .select({
      id: stickers.id,
      characterId: categories.characterId,
      name: stickers.name,
      previewSrc: stickers.previewSrc,
      width: stickers.width,
      height: stickers.height,
      visualHashV2: stickers.visualHashV2,
      categoryId: stickers.categoryId,
      tags: stickers.tags,
      submittedAt: stickers.submittedAt,
      submitterName: users.name,
      submitterLogin: users.githubLogin,
    })
    .from(stickers)
    .innerJoin(categories, eq(stickers.categoryId, categories.id))
    .leftJoin(users, eq(stickers.submittedById, users.id))
    .where(eq(stickers.status, "pending"))
    .orderBy(asc(stickers.submittedAt));
}

type PendingSubmission = Awaited<ReturnType<typeof listPendingSubmissions>>[number] & {
  previewSrc: string | null;
};

function toReviewItem(
  submission: PendingSubmission,
  similar: readonly SimilarSticker[],
): SubmissionReviewItem {
  if (!submission.previewSrc) {
    throw new Error(`投稿缺少 previewSrc：${submission.id}，请先运行 pnpm db:backfill-previews。`);
  }
  return {
    id: submission.id,
    name: submission.name,
    previewSrc: submission.previewSrc,
    width: submission.width,
    height: submission.height,
    categoryId: submission.categoryId,
    tags: submission.tags,
    submittedAt: submission.submittedAt.toISOString(),
    submitterName: submission.submitterName,
    submitterLogin: submission.submitterLogin,
    similarCandidates: similar.map(toSimilarCandidate),
  };
}

function toSimilarCandidate(candidate: SimilarSticker): SimilarCandidate {
  return {
    id: candidate.id,
    name: candidate.name,
    previewSrc: candidate.previewSrc,
    status: candidate.status,
    distance: candidate.distance,
  };
}
