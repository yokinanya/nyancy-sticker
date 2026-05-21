export type StickerExt = "png" | "gif" | "webp" | "jpg" | "jpeg";

export interface Sticker {
  id: string;
  name: string;
  src: string;
  thumb?: string;
  width: number;
  height: number;
  category: string;
  tags: string[];
  ext: StickerExt;
  /** sha256 前 16 位，用于上传去重；可选 */
  hash?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

export interface Manifest {
  categories: Category[];
  stickers: Sticker[];
}
