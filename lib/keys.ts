import type { StickerExt } from "@/lib/types";

interface CategoryRef {
  characterId: string;
  slug: string;
}

export function stickerKey(category: CategoryRef, hash: string, ext: StickerExt): string {
  const parts = ["stickers", category.characterId, category.slug];
  return `${parts.map(encodeURIComponent).join("/")}/${hash}.${ext}`;
}

export function previewKey(category: CategoryRef, hash: string, ext: "webp" | "gif"): string {
  const parts = ["previews", category.characterId, category.slug];
  const size = ext === "gif" ? 160 : 240;
  return `${parts.map(encodeURIComponent).join("/")}/${hash}-${size}.${ext}`;
}
