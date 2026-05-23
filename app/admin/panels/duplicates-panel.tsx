import { DuplicateReviewList } from "@/app/admin/duplicates/duplicate-list";
import { listDuplicateGroups } from "@/lib/queries/similar-stickers";

export async function DuplicatesPanel() {
  const groups = await listDuplicateGroups();
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-default-200 bg-content1 p-6 text-center text-sm text-default-500">
        当前没有疑似重复的 active 贴纸。
      </p>
    );
  }
  return <DuplicateReviewList groups={groups} />;
}
