import { requireUser } from "@/lib/auth-helpers";
import { listAllCategories } from "@/lib/queries/categories";
import { BatchUploadForm } from "@/components/batch-upload-form";

export const metadata = { title: "投稿表情包" };

export default async function SubmitPage() {
  await requireUser();
  const categories = await listAllCategories();
  return (
    <div className="motion-page mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-semibold">投稿表情包</h1>
      <p className="mb-6 text-sm text-default-500">
        支持批量投稿。先选角色和子分类，再拖入图片，系统会自动检查重复，逐张上传。所有投稿进入审核队列。
      </p>
      <BatchUploadForm
        categories={categories}
        endpoint="/api/submit"
        submitLabel="开始上传"
        allowCreateSubcategory
      />
    </div>
  );
}
