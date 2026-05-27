import "server-only";

import { db } from "@/lib/db";
import { stickers } from "@/drizzle/schema";
import type { UploadedSticker } from "@/lib/upload";

export interface StickerRecordInput {
  category: string;
  name: string;
  tags: string;
  uploaded: UploadedSticker;
  userId: string;
}

export async function insertPendingSticker(input: StickerRecordInput): Promise<void> {
  await db.insert(stickers).values({
    id: input.uploaded.hash,
    name: input.name,
    src: input.uploaded.src,
    previewSrc: input.uploaded.previewSrc,
    width: input.uploaded.width,
    height: input.uploaded.height,
    ext: input.uploaded.ext,
    hash: input.uploaded.hash,
    visualHash: input.uploaded.visualHash,
    visualHashV2: input.uploaded.visualHashV2,
    categoryId: input.category,
    tags: splitTags(input.tags),
    status: "pending",
    submittedById: input.userId,
  });
}

export async function insertApprovedSticker(input: StickerRecordInput): Promise<void> {
  await db.insert(stickers).values({
    id: input.uploaded.hash,
    name: input.name,
    src: input.uploaded.src,
    previewSrc: input.uploaded.previewSrc,
    width: input.uploaded.width,
    height: input.uploaded.height,
    ext: input.uploaded.ext,
    hash: input.uploaded.hash,
    visualHash: input.uploaded.visualHash,
    visualHashV2: input.uploaded.visualHashV2,
    categoryId: input.category,
    tags: splitTags(input.tags),
    status: "approved",
    submittedById: input.userId,
    approvedById: input.userId,
    approvedAt: new Date(),
  });
}

export function isDuplicateStickerError(error: unknown): boolean {
  return error instanceof Error && /sticker_hash_active_idx|duplicate key/i.test(error.message);
}

function splitTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}
