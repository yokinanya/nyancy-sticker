import type { Sticker } from "@/lib/types";

export type GallerySortMode = "default" | "newest" | "oldest" | "name";

export function orderGalleryStickers(
  stickers: readonly Sticker[],
  _selectedCategory: string | null,
  sortMode: GallerySortMode,
): Sticker[] {
  if (sortMode === "newest") return [...stickers].sort(compareSubmittedAtDesc);
  if (sortMode === "oldest") return [...stickers].sort(compareSubmittedAtAsc);
  if (sortMode === "name") return [...stickers].sort(compareNameAsc);
  return [...stickers].sort(compareIdAsc);
}

function compareIdAsc(left: Sticker, right: Sticker) {
  return left.id.localeCompare(right.id);
}

function compareSubmittedAtDesc(left: Sticker, right: Sticker) {
  const byTime = Date.parse(right.submittedAt) - Date.parse(left.submittedAt);
  return byTime || left.id.localeCompare(right.id);
}

function compareSubmittedAtAsc(left: Sticker, right: Sticker) {
  const byTime = Date.parse(left.submittedAt) - Date.parse(right.submittedAt);
  return byTime || left.id.localeCompare(right.id);
}

function compareNameAsc(left: Sticker, right: Sticker) {
  return left.name.localeCompare(right.name, "zh-CN") || left.id.localeCompare(right.id);
}
