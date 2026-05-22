const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const EXT_MAP: Record<string, "png" | "gif" | "webp" | "jpg" | "jpeg"> = {
  ".png": "png",
  ".gif": "gif",
  ".webp": "webp",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
};

export type StickerExt = "png" | "gif" | "webp" | "jpg" | "jpeg";

export const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type);
}

export function extOfName(name: string): StickerExt | null {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return null;
  return EXT_MAP[name.slice(idx).toLowerCase()] ?? null;
}

export function baseName(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(0, idx) : name;
}
