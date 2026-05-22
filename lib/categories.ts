import type { Category, Sticker } from "@/lib/types";

export function childCategoryIds(categories: readonly Category[], parentId: string) {
  return categories
    .filter((category) => category.parentId === parentId)
    .map((category) => category.id);
}

export function categoryAndDescendantIds(categories: readonly Category[], id: string) {
  const ids = new Set([id]);
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const childId of childCategoryIds(categories, current)) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      stack.push(childId);
    }
  }
  return ids;
}

export function categoryMatches(
  categories: readonly Category[],
  stickerCategory: string,
  selectedCategory: string,
) {
  return categoryAndDescendantIds(categories, selectedCategory).has(stickerCategory);
}

export function countStickersByCategoryTree(
  categories: readonly Category[],
  stickers: readonly Sticker[],
) {
  const direct = new Map<string, number>();
  stickers.forEach((sticker) => {
    direct.set(sticker.category, (direct.get(sticker.category) ?? 0) + 1);
  });
  const counts: Record<string, number> = {};
  categories.forEach((category) => {
    const ids = categoryAndDescendantIds(categories, category.id);
    counts[category.id] = [...ids].reduce((sum, id) => sum + (direct.get(id) ?? 0), 0);
  });
  return counts;
}

export function categoryLabel(category: Category) {
  return category.parentId ? `  ${category.name}` : category.name;
}

export function topLevelCategories(categories: readonly Category[]) {
  return categories.filter((category) => !category.parentId);
}
