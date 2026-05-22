import type { Category, Sticker } from "@/lib/types";

export function childCategoryIds(categories: readonly Category[], parentId: string) {
  return createChildrenMap(categories).get(parentId) ?? [];
}

export function categoryAndDescendantIds(categories: readonly Category[], id: string) {
  return collectDescendantIds(createChildrenMap(categories), id);
}

export function createCategoryDescendantMap(categories: readonly Category[]) {
  const children = createChildrenMap(categories);
  const descendants = new Map<string, ReadonlySet<string>>();
  for (const category of categories) {
    descendants.set(category.id, collectDescendantIds(children, category.id));
  }
  return descendants;
}

function createChildrenMap(categories: readonly Category[]) {
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = children.get(category.parentId) ?? [];
    siblings.push(category.id);
    children.set(category.parentId, siblings);
  }
  return children;
}

function collectDescendantIds(children: ReadonlyMap<string, readonly string[]>, id: string) {
  const ids = new Set([id]);
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const childId of children.get(current) ?? []) {
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
  const descendantMap = createCategoryDescendantMap(categories);
  const direct = new Map<string, number>();
  stickers.forEach((sticker) => {
    direct.set(sticker.category, (direct.get(sticker.category) ?? 0) + 1);
  });
  const counts: Record<string, number> = {};
  categories.forEach((category) => {
    const ids = descendantMap.get(category.id) ?? new Set([category.id]);
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
