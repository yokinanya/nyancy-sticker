import { listCategoriesWithCounts, listCharactersForCategoryManager } from "@/lib/queries/categories";
import { CategoryManager } from "./category-manager";

export async function CategoriesPanel() {
  const [characters, categories] = await Promise.all([
    listCharactersForCategoryManager(),
    listCategoriesWithCounts(),
  ]);
  return <CategoryManager categories={categories} characters={characters} />;
}
