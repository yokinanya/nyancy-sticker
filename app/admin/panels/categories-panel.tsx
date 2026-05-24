import { listCategoriesWithCounts, listCharactersForCategoryManager } from "@/lib/queries/categories";
import { CategoryManager } from "./category-manager";

interface Props {
  isAdmin: boolean;
}

export async function CategoriesPanel({ isAdmin }: Props) {
  const [characters, categories] = await Promise.all([
    listCharactersForCategoryManager(),
    listCategoriesWithCounts(),
  ]);
  return <CategoryManager categories={categories} characters={characters} canAddRole={isAdmin} />;
}
