import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stickers, users } from "@/drizzle/schema";
import { listAllCategories } from "@/lib/queries/categories";
import { SubmissionList } from "@/app/admin/submissions/submission-list";

export async function SubmissionsPanel() {
  const [pending, categories] = await Promise.all([
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
        submittedAt: stickers.submittedAt,
        submitterName: users.name,
        submitterLogin: users.githubLogin,
      })
      .from(stickers)
      .leftJoin(users, eq(stickers.submittedById, users.id))
      .where(eq(stickers.status, "pending"))
      .orderBy(asc(stickers.submittedAt)),
    listAllCategories(),
  ]);

  if (pending.length === 0) {
    return (
      <p className="rounded-lg border border-default-200 bg-content1 p-6 text-center text-sm text-default-500">
        当前没有待审核投稿。
      </p>
    );
  }

  return <SubmissionList submissions={pending} categories={categories} />;
}
