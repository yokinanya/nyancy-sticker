export const SORT_ORDER_STEP = 10;

interface SortableItem {
  readonly sortOrder: number;
}

export function nextSortOrder(items: readonly SortableItem[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.sortOrder)) + SORT_ORDER_STEP;
}

export function compareSortOrderThenId(
  left: SortableItem & { readonly id: string },
  right: SortableItem & { readonly id: string },
): number {
  return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
}

export function compareSortOrderThenSlug(
  left: SortableItem & { readonly slug: string },
  right: SortableItem & { readonly slug: string },
): number {
  return left.sortOrder - right.sortOrder || left.slug.localeCompare(right.slug);
}
