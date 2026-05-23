import type { StickerExt } from "@/lib/types";

interface CategoryRef {
  id: string;
  parentId?: string | null;
}

export function stickerKey(category: CategoryRef, hash: string, ext: StickerExt): string {
  const parts = category.parentId
    ? ["stickers", category.parentId, category.id]
    : ["stickers", category.id];
  return `${parts.map(encodeURIComponent).join("/")}/${hash}.${ext}`;
}

export function previewKey(category: CategoryRef, hash: string, ext: "webp" | "gif"): string {
  const parts = category.parentId
    ? ["previews", category.parentId, category.id]
    : ["previews", category.id];
  const size = ext === "gif" ? 160 : 240;
  return `${parts.map(encodeURIComponent).join("/")}/${hash}-${size}.${ext}`;
}
