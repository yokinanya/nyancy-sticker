export type StickerExt = "png" | "gif" | "webp" | "jpg" | "jpeg";

export interface Sticker {
  id: string;
  name: string;
  src: string;
  category: string;
  tags: string[];
  ext: StickerExt;
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
