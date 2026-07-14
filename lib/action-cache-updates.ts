import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { CATEGORY_TREE_CACHE_TAG } from "@/lib/queries/categories";
import {
  CHARACTER_DATA_CACHE_TAG,
  CHARACTER_LIST_CACHE_TAG,
  characterCacheTag,
} from "@/lib/queries/characters";
import { SIMILAR_STICKERS_CACHE_TAG } from "@/lib/queries/similar-stickers";
import { characterGalleryCacheTag } from "@/lib/queries/stickers";
import { SITE_NOTICE_CACHE_TAG } from "@/lib/site-notice-constants";

interface PublishedStickerUpdate {
  readonly characterIds: readonly string[];
  readonly countsChanged: boolean;
}

interface CategoryUpdate {
  readonly characterIds: readonly string[];
  readonly countsChanged: boolean;
}

export function updatePendingStickerData(): void {
  updateTag(SIMILAR_STICKERS_CACHE_TAG);
  revalidatePath("/admin");
}

export function updatePublishedStickerData(
  update: PublishedStickerUpdate,
): void {
  updateTag(SIMILAR_STICKERS_CACHE_TAG);
  updateGalleryTags(update.characterIds);
  if (update.countsChanged) updateTag(CHARACTER_LIST_CACHE_TAG);
  revalidatePath("/admin");
  if (update.countsChanged) revalidatePath("/");
}

export function updateCategoryData(update: CategoryUpdate): void {
  updateTag(CATEGORY_TREE_CACHE_TAG);
  updateTag(SIMILAR_STICKERS_CACHE_TAG);
  updateGalleryTags(update.characterIds);
  if (update.countsChanged) updateTag(CHARACTER_LIST_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/admin");
}

export function updateCharacterData(characterIds: readonly string[]): void {
  updateTag(CHARACTER_DATA_CACHE_TAG);
  updateTag(CHARACTER_LIST_CACHE_TAG);
  updateTag(CATEGORY_TREE_CACHE_TAG);
  for (const id of uniqueIds(characterIds)) updateTag(characterCacheTag(id));
  revalidatePath("/");
  revalidatePath("/admin");
}

export function updateSimilarityData(): void {
  updateTag(SIMILAR_STICKERS_CACHE_TAG);
  revalidatePath("/admin");
}

export function updateNoticeData(): void {
  updateTag(SITE_NOTICE_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/admin");
}

export function updateAdminStickerData(): void {
  revalidatePath("/admin");
}

function updateGalleryTags(characterIds: readonly string[]): void {
  for (const id of uniqueIds(characterIds)) {
    updateTag(characterGalleryCacheTag(id));
  }
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
