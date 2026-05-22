import { listAllCategories } from "@/lib/queries/categories";
import { BatchUploadForm } from "@/components/batch-upload-form";

export async function UploadFormPanel() {
  const categories = await listAllCategories();
  return (
    <BatchUploadForm
      categories={categories}
      endpoint="/api/admin/upload-one"
      submitLabel="批量发布"
      allowCreateSubcategory
    />
  );
}
