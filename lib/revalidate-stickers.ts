import { revalidatePath, revalidateTag } from "next/cache";
import { CATEGORY_TREE_CACHE_TAG } from "@/lib/queries/categories";
import { CHARACTER_LIST_CACHE_TAG } from "@/lib/queries/characters";
import { SIMILAR_STICKERS_CACHE_TAG } from "@/lib/queries/similar-stickers";

export function revalidateStickerViews(): void {
  revalidateTag(CATEGORY_TREE_CACHE_TAG, "max");
  revalidateTag(CHARACTER_LIST_CACHE_TAG, "max");
  revalidateTag(SIMILAR_STICKERS_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/admin");
}
