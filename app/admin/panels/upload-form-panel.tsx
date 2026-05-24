import { listAllCategories } from "@/lib/queries/categories";
import { listCachedCharactersWithCounts } from "@/lib/queries/characters";
import { BatchUploadForm } from "@/components/batch-upload-form";

export async function UploadFormPanel() {
  const [categories, characters] = await Promise.all([
    listAllCategories(),
    listCachedCharactersWithCounts(),
  ]);
  return (
    <BatchUploadForm
      categories={categories}
      characters={characters}
      endpoint="/api/admin/upload-one"
      submitLabel="批量发布"
      allowCreateSubcategory
    />
  );
}
