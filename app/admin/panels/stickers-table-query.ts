import type { Category } from "@/lib/types";

export interface StickerTableFilters {
  q: string;
  status: string;
  character: string;
  category: string;
  submitter: string;
}

export type StickerFilterUpdates = Partial<StickerTableFilters>;

export const EMPTY_STICKER_FILTERS: StickerTableFilters = {
  q: "",
  status: "",
  character: "",
  category: "",
  submitter: "",
};

export function createCategoryDisplayMap(categories: readonly Category[]) {
  return new Map(categories.map((category) => [category.id, `${category.name} (${category.id})`]));
}

export function categoryDisplayName(displayMap: ReadonlyMap<string, string>, categoryId: string) {
  return displayMap.get(categoryId) ?? categoryId;
}
