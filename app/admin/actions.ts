"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categoryIdFor } from "@/lib/category-ids";
import { categories, characters, stickers } from "@/drizzle/schema";
import { requireAdmin, requireEditor } from "@/lib/auth-helpers";
import {
  updateAdminStickerData,
  updateCategoryData,
  updateCharacterData,
  updatePublishedStickerData,
} from "@/lib/action-cache-updates";
import { keyFromUrl, remove } from "@/lib/r2";
import { uploadStickerFile } from "@/lib/upload";
import { uploadCharacterBackground } from "@/lib/character-background";
import {
  ensureCategorySlugAvailable,
  readCharacterVisibility,
  readInteger,
  readOptionalText,
  readSelectedIds,
  readStickerStatus,
  readText,
  requireCategory,
  requireCharacter,
  splitTags,
} from "./action-input";
import {
  listStickerMutationRows,
  requireStickerMutationRow,
} from "./sticker-mutation-data";
import {
  updateBulkStickerData,
  updateSingleStickerData,
} from "./sticker-mutation-updates";

export async function bulkUpdateStickers(formData: FormData): Promise<void> {
  await requireEditor();
  const idList = readSelectedIds(formData);
  const operation = readText(formData, "operation");
  const before = await listStickerMutationRows(idList);
  let targetCharacterId: string | undefined;

  if (operation === "category") {
    const category = readText(formData, "category");
    const target = await requireCategory(category);
    targetCharacterId = target.characterId;
    await db.update(stickers).set({ categoryId: category }).where(inArray(stickers.id, idList));
  } else if (operation === "add-tags") {
    const tags = splitTags(readText(formData, "tags"));
    await db
      .update(stickers)
      .set({
        tags: sql`(SELECT ARRAY(SELECT DISTINCT unnest(${stickers.tags} || ${tags}::text[])))`,
      })
      .where(inArray(stickers.id, idList));
  } else if (operation === "remove-tags") {
    const tags = splitTags(readText(formData, "tags"));
    await db
      .update(stickers)
      .set({
        tags: sql`(SELECT ARRAY(SELECT t FROM unnest(${stickers.tags}) AS t WHERE t <> ALL(${tags}::text[])))`,
      })
      .where(inArray(stickers.id, idList));
  } else if (operation === "delete") {
    await deleteRejectedStickers(idList);
    updateAdminStickerData();
    return;
  } else {
    throw new Error(`未知批量操作：${operation}`);
  }

  updateBulkStickerData(before, targetCharacterId);
}

async function deleteRejectedStickers(ids: readonly string[]): Promise<void> {
  const rows = await db
    .select({
      id: stickers.id,
      previewSrc: stickers.previewSrc,
      src: stickers.src,
      status: stickers.status,
    })
    .from(stickers)
    .where(inArray(stickers.id, ids));
  assertOnlyRejectedRows(ids, rows);
  await Promise.all(rows.flatMap((row) => stickerObjectKeys(row).map((key) => remove(key))));
  await db
    .delete(stickers)
    .where(and(inArray(stickers.id, rows.map((row) => row.id)), eq(stickers.status, "rejected")));
}

function assertOnlyRejectedRows(ids: readonly string[], rows: readonly DeletableStickerRow[]): void {
  if (rows.length !== ids.length) throw new Error("部分贴纸不存在，无法删除。");
  const active = rows.filter((row) => row.status !== "rejected");
  if (active.length > 0) {
    throw new Error(`只能删除已拒绝的贴纸，以下贴纸不是已拒绝状态：${active.map((row) => row.id).join(", ")}`);
  }
}

function stickerObjectKeys(row: Pick<DeletableStickerRow, "previewSrc" | "src">): string[] {
  return [row.src, row.previewSrc]
    .map((url) => (url ? keyFromUrl(url) : null))
    .filter((key): key is string => Boolean(key));
}

interface DeletableStickerRow {
  id: string;
  previewSrc: string | null;
  src: string;
  status: "approved" | "pending" | "rejected";
}

export async function uploadStickers(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const category = readText(formData, "uploadCategory");
  const categoryRow = await requireCategory(category);
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);
  if (files.length === 0) throw new Error("请选择至少一个图片文件。");
  const tagsValue = formData.get("uploadTags");
  const tags = typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];
  for (const file of files) {
    const uploaded = await uploadStickerFile(file, category);
    await db
      .insert(stickers)
      .values({
        id: uploaded.hash,
        name: uploaded.baseName,
        src: uploaded.src,
        previewSrc: uploaded.previewSrc,
        width: uploaded.width,
        height: uploaded.height,
        ext: uploaded.ext,
        hash: uploaded.hash,
        visualHash: uploaded.visualHash,
        visualHashV2: uploaded.visualHashV2,
        categoryId: category,
        tags,
        status: "approved",
        submittedById: session.user.id,
        approvedById: session.user.id,
        approvedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  updatePublishedStickerData({
    characterIds: [categoryRow.characterId],
    countsChanged: true,
  });
}

export async function updateSticker(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = readText(formData, "id");
  const category = readText(formData, "editCategory");
  const targetCategory = await requireCategory(category);
  const before = await requireStickerMutationRow(id);
  const name = readText(formData, "editName");
  const status = readStickerStatus(formData);
  const tagsValue = formData.get("editTags");
  const tags =
    typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];
  const approvalFields = status === "approved"
    ? { approvedById: session.user.id, approvedAt: new Date(), rejectionReason: null }
    : { approvedById: null, approvedAt: null, rejectionReason: null };

  await db
    .update(stickers)
    .set({ name, categoryId: category, tags, status, ...approvalFields })
    .where(eq(stickers.id, id));
  updateSingleStickerData({
    before,
    nextStatus: status,
    nextCharacterId: targetCategory.characterId,
  });
}

export async function addCategory(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const characterId = readText(formData, "characterId");
  const slug = readText(formData, "categoryId");
  await requireCharacter(characterId);
  await ensureCategorySlugAvailable({ characterId, slug });
  const id = categoryIdFor(characterId, slug);
  await db.insert(categories).values({
    id,
    name: readText(formData, "categoryName"),
    slug,
    sortOrder: readInteger(formData, "categorySortOrder"),
    characterId,
    createdById: session.user.id,
  });
  updateCategoryData({ characterIds: [characterId], countsChanged: false });
}

export async function updateCategory(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "categoryId");
  const previous = await requireCategory(id);
  const characterId = readText(formData, "characterId");
  const slug = readText(formData, "categorySlug");
  await requireCharacter(characterId);
  await ensureCategorySlugAvailable({ characterId, slug, currentId: id });
  await db
    .update(categories)
    .set({
      name: readText(formData, "categoryName"),
      slug,
      sortOrder: readInteger(formData, "categorySortOrder"),
      characterId,
    })
    .where(eq(categories.id, id));
  updateCategoryData({
    characterIds: [previous.characterId, characterId],
    countsChanged: previous.characterId !== characterId,
  });
}

export async function addCharacter(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = readText(formData, "characterId");
  const exists = await db.query.characters.findFirst({ where: eq(characters.id, id) });
  if (exists) throw new Error(`角色已存在：${id}`);
  await db.insert(characters).values({
    id,
    name: readText(formData, "characterName"),
    sortOrder: readInteger(formData, "characterSortOrder"),
    visibility: readCharacterVisibility(formData),
    backgroundImageUrl: readOptionalText(formData, "characterBackgroundImageUrl"),
    createdById: session.user.id,
  });
  updateCharacterData([id]);
}

export async function updateCharacter(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "characterId");
  await db
    .update(characters)
    .set({
      name: readText(formData, "characterName"),
      sortOrder: readInteger(formData, "characterSortOrder"),
      visibility: readCharacterVisibility(formData),
      backgroundImageUrl: readOptionalText(formData, "characterBackgroundImageUrl"),
    })
    .where(eq(characters.id, id));
  updateCharacterData([id]);
}

export async function uploadCharacterBackgroundAction(formData: FormData): Promise<string> {
  await requireEditor();
  const characterId = readText(formData, "characterId");
  const file = formData.get("backgroundImage");
  if (!(file instanceof File)) throw new Error("请上传背景图文件。");
  return uploadCharacterBackground(file, characterId);
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "categoryId");
  const category = await requireCategory(id);
  const used = await db.query.stickers.findFirst({ where: eq(stickers.categoryId, id) });
  if (used) throw new Error(`分类仍被使用，不能删除：${id}`);
  await db.delete(categories).where(eq(categories.id, id));
  updateCategoryData({ characterIds: [category.characterId], countsChanged: false });
}

export async function deleteCharacter(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "characterId");
  const child = await db.query.categories.findFirst({ where: eq(categories.characterId, id) });
  if (child) throw new Error(`该角色下还有分类，请先删除子分类：${id}`);
  await db.delete(characters).where(eq(characters.id, id));
  updateCharacterData([id]);
}
