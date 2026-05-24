export type StickerExt = "png" | "gif" | "webp" | "jpg" | "jpeg";
export type CharacterVisibility = "public" | "hidden" | "admin_only";

export interface Sticker {
  id: string;
  name: string;
  src: string;
  previewSrc: string;
  width: number;
  height: number;
  category: string;
  tags: string[];
  ext: StickerExt;
}

export interface Character {
  id: string;
  name: string;
  visibility: CharacterVisibility;
  backgroundImageUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  characterId: string;
}

export interface Manifest {
  categories: Category[];
  stickers: Sticker[];
}
