import type { Category, Sticker } from "@/lib/types";

export interface CategoryTagCount {
  tag: string;
  count: number;
}

export function categoryAndDescendantIds(categories: readonly Category[], id: string) {
  return new Set(categories.some((category) => category.id === id) ? [id] : []);
}

export function createCategoryDescendantMap(categories: readonly Category[]) {
  return new Map(categories.map((category) => [category.id, new Set([category.id])]));
}

export function categoryMatches(
  categories: readonly Category[],
  selectedCategory: string | null,
  stickerCategory: string,
) {
  if (!selectedCategory) return true;
  return categoryAndDescendantIds(categories, selectedCategory).has(stickerCategory);
}

export function countStickersByCategoryTree(
  categories: readonly Category[],
  stickers: readonly Sticker[],
) {
  const counts: Record<string, number> = {};
  categories.forEach((category) => {
    counts[category.id] = 0;
  });
  stickers.forEach((sticker) => {
    counts[sticker.category] = (counts[sticker.category] ?? 0) + 1;
  });
  return counts;
}

export function countTagsByCategoryTree(
  categories: readonly Category[],
  stickers: readonly Sticker[],
) {
  const counts = countTagsByCategory(stickers);
  const tagsByCategory = new Map<string | null, CategoryTagCount[]>();
  tagsByCategory.set(null, sortTagCounts(mergeTagCounts([...counts.values()])));
  categories.forEach((category) => {
    tagsByCategory.set(category.id, sortTagCounts(counts.get(category.id) ?? new Map()));
  });
  return tagsByCategory;
}

function countTagsByCategory(stickers: readonly Sticker[]) {
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

function mergeTagCounts(maps: readonly Map<string, number>[]) {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [tag, count] of map) merged.set(tag, (merged.get(tag) ?? 0) + count);
  }
  return merged;
}

function sortTagCounts(counts: ReadonlyMap<string, number>): CategoryTagCount[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function categoryLabel(category: Category) {
  return `${category.name} (${category.slug})`;
}

export function defaultCategoryId(categories: readonly Category[]) {
  return categories[0]?.id ?? null;
}
