import { listCategoriesWithCounts } from "@/lib/queries/categories";
import { CategoryManager } from "./category-manager";

export async function CategoriesPanel() {
  const categories = await listCategoriesWithCounts();
  return <CategoryManager categories={categories} />;
}
