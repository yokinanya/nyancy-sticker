import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stickers, users } from "@/drizzle/schema";
import { listAllCategories } from "@/lib/queries/categories";
import { listCachedCharactersWithCounts } from "@/lib/queries/characters";
import { findSimilarStickersForSources } from "@/lib/queries/similar-stickers";
import { SubmissionList } from "@/app/admin/submissions/submission-list";

export async function SubmissionsPanel() {
  const [pending, categories, characters] = await Promise.all([
    listPendingSubmissions(),
    listAllCategories(),
    listCachedCharactersWithCounts(),
  ]);

  if (pending.length === 0) {
    return (
      <p className="rounded-lg border border-default-200 bg-content1 p-6 text-center text-sm text-default-500">
        当前没有待审核投稿。
      </p>
    );
  }

  const similarById = await findSimilarStickersForSources(pending);
  const submissions = pending.map((submission) => ({
    ...requirePreviewSrc(submission),
    similarCandidates: similarById.get(submission.id) ?? [],
  }));
  return <SubmissionList submissions={submissions} categories={categories} characters={characters} />;
}

function listPendingSubmissions() {
  return db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      previewSrc: stickers.previewSrc,
      width: stickers.width,
      height: stickers.height,
      ext: stickers.ext,
      hash: stickers.hash,
      visualHash: stickers.visualHash,
      categoryId: stickers.categoryId,
      tags: stickers.tags,
      submittedAt: stickers.submittedAt,
      submitterName: users.name,
      submitterLogin: users.githubLogin,
    })
    .from(stickers)
    .leftJoin(users, eq(stickers.submittedById, users.id))
    .where(eq(stickers.status, "pending"))
    .orderBy(asc(stickers.submittedAt));
}

type PendingSubmission = Awaited<ReturnType<typeof listPendingSubmissions>>[number] & {
  previewSrc: string | null;
};

function requirePreviewSrc<T extends PendingSubmission>(
  submission: T,
): Omit<T, "previewSrc"> & { previewSrc: string } {
  if (!submission.previewSrc) {
    throw new Error(`投稿缺少 previewSrc：${submission.id}，请先运行 pnpm db:backfill-previews。`);
  }
  return { ...submission, previewSrc: submission.previewSrc };
}
