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
  descendantMap = createCategoryDescendantMap(categories),
) {
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

export interface CategoryTagCount {
  tag: string;
  count: number;
}

export function countTagsByCategoryTree(
  categories: readonly Category[],
  stickers: readonly Sticker[],
  descendantMap = createCategoryDescendantMap(categories),
) {
  const directCounts = countDirectTags(stickers);
  const tagsByCategory = new Map<string | null, CategoryTagCount[]>();
  tagsByCategory.set(null, sortTagCounts(mergeTagCounts(directCounts.values())));
  for (const category of categories) {
    const ids = descendantMap.get(category.id) ?? new Set([category.id]);
    const maps = [...ids].map((id) => directCounts.get(id) ?? new Map());
    tagsByCategory.set(category.id, sortTagCounts(mergeTagCounts(maps)));
  }
  return tagsByCategory;
}

function countDirectTags(stickers: readonly Sticker[]) {
  const counts = new Map<string, Map<string, number>>();
  for (const sticker of stickers) {
    const categoryCounts = counts.get(sticker.category) ?? new Map<string, number>();
    for (const tag of sticker.tags) {
      categoryCounts.set(tag, (categoryCounts.get(tag) ?? 0) + 1);
    }
    counts.set(sticker.category, categoryCounts);
  }
  return counts;
}

function mergeTagCounts(maps: Iterable<ReadonlyMap<string, number>>) {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [tag, count] of map) {
      merged.set(tag, (merged.get(tag) ?? 0) + count);
    }
  }
  return merged;
}

function sortTagCounts(counts: ReadonlyMap<string, number>) {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function categoryLabel(category: Category) {
  return category.parentId ? `  ${category.name}` : category.name;
}

export function topLevelCategories(categories: readonly Category[]) {
  return categories.filter((category) => !category.parentId);
}

export function defaultCategoryId(categories: readonly Category[]) {
  const firstParent = topLevelCategories(categories)[0];
  if (!firstParent) return null;
  return childCategoryIds(categories, firstParent.id)[0] ?? firstParent.id;
}
