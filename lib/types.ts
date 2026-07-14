export type StickerExt = "png" | "gif" | "webp" | "jpg" | "jpeg";
export type CharacterVisibility = "public" | "hidden" | "admin_only";

export interface CharacterRef {
  readonly id: string;
  readonly name: string;
}

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
  submittedAt: string;
}

export interface Character {
  id: string;
  name: string;
  sortOrder: number;
  visibility: CharacterVisibility;
  backgroundImageUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  characterId: string;
}

export interface Manifest {
  categories: Category[];
  stickers: Sticker[];
}

export interface AdminStickerListItem {
  readonly id: string;
  readonly name: string;
  readonly previewSrc: string;
  readonly width: number;
  readonly height: number;
  readonly ext: StickerExt;
  readonly categoryId: string;
  readonly tags: string[];
  readonly status: "approved" | "pending" | "rejected";
  readonly submittedAt: string;
  readonly submitterName: string | null;
  readonly submitterLogin: string | null;
}

export interface SimilarCandidate {
  readonly id: string;
  readonly name: string;
  readonly previewSrc: string;
  readonly status: "approved" | "pending";
  readonly distance: number;
}

export interface SubmissionReviewItem {
  readonly id: string;
  readonly name: string;
  readonly previewSrc: string;
  readonly width: number;
  readonly height: number;
  readonly categoryId: string;
  readonly tags: string[];
  readonly submittedAt: string;
  readonly submitterName: string | null;
  readonly submitterLogin: string | null;
  readonly similarCandidates: readonly SimilarCandidate[];
}
