import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { CHARACTER_LIST_CACHE_TAG } from "@/lib/queries/characters";
import { SIMILAR_STICKERS_CACHE_TAG } from "@/lib/queries/similar-stickers";
import { characterGalleryCacheTag } from "@/lib/queries/stickers";

export function revalidatePendingStickerData(): void {
  revalidateTag(SIMILAR_STICKERS_CACHE_TAG, "max");
  revalidatePath("/admin");
}

export function revalidatePublishedStickerData(
  characterIds: readonly string[],
): void {
  revalidateTag(CHARACTER_LIST_CACHE_TAG, "max");
  revalidateTag(SIMILAR_STICKERS_CACHE_TAG, "max");
  for (const id of new Set(characterIds.filter(Boolean))) {
    revalidateTag(characterGalleryCacheTag(id), "max");
  }
  revalidatePath("/");
  revalidatePath("/admin");
}
