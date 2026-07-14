"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers } from "@/drizzle/schema";
import { requireEditor } from "@/lib/auth-helpers";
import {
  updatePendingStickerData,
  updatePublishedStickerData,
} from "@/lib/action-cache-updates";
import { keyFromUrl, remove } from "@/lib/r2";

export async function approveSubmission(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = readText(formData, "id");
  const category = readText(formData, "category");
  const name = readText(formData, "name");
  const tagsValue = formData.get("tags");
  const tags = typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];

  const found = await db.query.categories.findFirst({ where: eq(categories.id, category) });
  if (!found) throw new Error(`分类不存在：${category}`);

  const result = await db
    .update(stickers)
    .set({
      name,
      categoryId: category,
      tags,
      status: "approved",
      approvedById: session.user.id,
      approvedAt: new Date(),
      rejectionReason: null,
    })
    .where(and(eq(stickers.id, id), eq(stickers.status, "pending")))
    .returning({ id: stickers.id });

  if (result.length === 0) throw new Error("投稿不存在或已被处理。");

  updatePublishedStickerData({
    characterIds: [found.characterId],
    countsChanged: true,
  });
}

export async function rejectSubmission(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "id");
  const reasonValue = formData.get("reason");
  const reason =
    typeof reasonValue === "string" && reasonValue.trim() ? reasonValue.trim() : null;

  const sticker = await db.query.stickers.findFirst({
    where: and(eq(stickers.id, id), eq(stickers.status, "pending")),
  });
  if (!sticker) throw new Error("投稿不存在或已被处理。");

  await removeStickerObjects(sticker.src, sticker.previewSrc);

  await db
    .update(stickers)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(stickers.id, id));

  updatePendingStickerData();
}

async function removeStickerObjects(src: string, previewSrc: string | null): Promise<void> {
  const keys = [keyFromUrl(src), previewSrc ? keyFromUrl(previewSrc) : null].filter(
    (key): key is string => Boolean(key),
  );
  await Promise.all(keys.map((key) => remove(key)));
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

function splitTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}
