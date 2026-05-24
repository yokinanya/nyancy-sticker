import { requireUser } from "@/lib/auth-helpers";
import { listAllCategories } from "@/lib/queries/categories";
import { listCachedCharactersWithCounts } from "@/lib/queries/characters";
import { BatchUploadForm } from "@/components/batch-upload-form";

export const metadata = { title: "投稿表情包" };

export default async function SubmitPage() {
  await requireUser();
  const [categories, characters] = await Promise.all([
    listAllCategories(),
    listCachedCharactersWithCounts(),
  ]);
  return (
    <div className="motion-page page-shell flex max-w-3xl flex-col gap-4">
      <section className="toolbar p-3">
        <h1 className="text-xl font-semibold tracking-tight">投稿表情包</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          支持批量投稿。先选角色和分类，再拖入图片，系统会自动检查重复，逐张上传。所有投稿进入审核队列。
        </p>
      </section>
      <BatchUploadForm
        categories={categories}
        characters={characters}
        endpoint="/api/submit"
        submitLabel="开始上传"
        allowCreateSubcategory
      />
    </div>
  );
}
