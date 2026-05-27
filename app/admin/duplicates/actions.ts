"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { stickerSimilarityDecisions, stickers } from "@/drizzle/schema";
import { requireEditor } from "@/lib/auth-helpers";
import { CATEGORY_TREE_CACHE_TAG } from "@/lib/queries/categories";
import { CHARACTER_LIST_CACHE_TAG } from "@/lib/queries/characters";
import { SIMILAR_STICKERS_CACHE_TAG, listDuplicateGroups } from "@/lib/queries/similar-stickers";
import { normalizePair } from "@/lib/similarity-groups";

const ACTIVE_STATUSES = ["approved", "pending"] as const;

export interface RejectDuplicateInput {
  keepIds: readonly string[];
  rejectIds: readonly string[];
}

export interface MarkVariantInput {
  stickerIds: readonly string[];
}

export async function rejectDuplicateStickers(input: RejectDuplicateInput): Promise<void> {
  await requireEditor();
  const { keepIds, rejectIds } = normalizeRejectInput(input);
  await ensureSameDuplicateGroup(keepIds[0], [...keepIds.slice(1), ...rejectIds]);

  const result = await db
    .update(stickers)
    .set({
      status: "rejected",
      approvedById: null,
      approvedAt: null,
      rejectionReason: duplicateReason(keepIds),
    })
    .where(and(inArray(stickers.id, rejectIds), inArray(stickers.status, ACTIVE_STATUSES)))
    .returning({ id: stickers.id });

  if (result.length !== rejectIds.length) throw new Error("部分重复项不存在或已被处理。");
  revalidateDuplicatePages();
}

export async function markVariantStickers(input: MarkVariantInput): Promise<void> {
  const session = await requireEditor();
  const stickerIds = normalizeStickerIds(input.stickerIds);
  await ensureSameDuplicateGroup(stickerIds[0], stickerIds.slice(1));

  const values = pairValues(stickerIds, session.user.id);
  if (values.length === 0) throw new Error("差分保留至少需要两张贴纸。");

  await db.insert(stickerSimilarityDecisions).values(values).onConflictDoNothing();
  revalidateDuplicatePages();
}

function normalizeRejectInput(input: RejectDuplicateInput) {
  const keepIds = normalizeIds(input.keepIds);
  const rejectIds = normalizeIds(input.rejectIds);
  if (keepIds.length === 0) throw new Error("请选择至少一个保留项。");
  if (rejectIds.length === 0) throw new Error("请选择至少一个要标记为重复的贴纸。");
  const keepSet = new Set(keepIds);
  const overlap = rejectIds.filter((id) => keepSet.has(id));
  if (overlap.length > 0) throw new Error(`保留项不能同时被标记为重复：${overlap.join(", ")}`);
  return { keepIds, rejectIds };
}

function normalizeStickerIds(ids: readonly string[]): string[] {
  const normalized = normalizeIds(ids);
  if (normalized.length < 2) throw new Error("请选择至少两张贴纸。");
  return normalized;
}

function normalizeIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function ensureSameDuplicateGroup(keepId: string, rejectIds: readonly string[]): Promise<void> {
  const groups = await listDuplicateGroups();
  const group = groups.find((item) => item.stickers.some((sticker) => sticker.id === keepId));
  if (!group) throw new Error("保留项不存在或当前不在疑似重复组中。");
  const groupIds = new Set(group.stickers.map((sticker) => sticker.id));
  const invalidIds = rejectIds.filter((id) => !groupIds.has(id));
  if (invalidIds.length > 0) throw new Error(`重复项不在同一组：${invalidIds.join(", ")}`);
}

function pairValues(stickerIds: readonly string[], userId: string) {
  const rows: {
    createdById: string;
    decision: "keep_both";
    leftStickerId: string;
    reason: string;
    rightStickerId: string;
  }[] = [];
  for (let left = 0; left < stickerIds.length; left += 1) {
    for (let right = left + 1; right < stickerIds.length; right += 1) {
      const [leftStickerId, rightStickerId] = normalizePair(stickerIds[left], stickerIds[right]);
      rows.push({
        createdById: userId,
        decision: "keep_both",
        leftStickerId,
        reason: "视觉相似但属于表情差分/系列，人工确认全部保留。",
        rightStickerId,
      });
    }
  }
  return rows;
}

function duplicateReason(keepIds: readonly string[]): string {
  return `旧数据查重：与保留项 ${keepIds.join(", ")} 视觉相似，人工标记为重复。`;
}

function revalidateDuplicatePages() {
  revalidateTag(CATEGORY_TREE_CACHE_TAG, "max");
  revalidateTag(CHARACTER_LIST_CACHE_TAG, "max");
  revalidateTag(SIMILAR_STICKERS_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/admin");
}
