"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, characters, stickers } from "@/drizzle/schema";
import { requireEditor } from "@/lib/auth-helpers";
import { CATEGORY_TREE_CACHE_TAG } from "@/lib/queries/categories";
import { CHARACTER_LIST_CACHE_TAG } from "@/lib/queries/characters";
import { assertActiveVisualHashesComplete } from "@/lib/queries/similar-stickers";
import { keyFromUrl, remove } from "@/lib/r2";
import { uploadStickerFile } from "@/lib/upload";

export async function bulkUpdateStickers(formData: FormData): Promise<void> {
  await requireEditor();
  const ids = readSelectedIds(formData);
  const operation = readText(formData, "operation");
  const idList = [...ids];

  if (operation === "category") {
    const category = readText(formData, "category");
    await ensureSubcategoryExists(category);
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
  } else {
    throw new Error(`未知批量操作：${operation}`);
  }

  revalidateAdminPages();
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
  await ensureSubcategoryExists(category);
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);
  if (files.length === 0) throw new Error("请选择至少一个图片文件。");
  const tagsValue = formData.get("uploadTags");
  const tags = typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];
  await assertActiveVisualHashesComplete();

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
        categoryId: category,
        tags,
        status: "approved",
        submittedById: session.user.id,
        approvedById: session.user.id,
        approvedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  revalidateAdminPages();
}

export async function updateSticker(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = readText(formData, "id");
  const category = readText(formData, "editCategory");
  await ensureSubcategoryExists(category);
  const name = readText(formData, "editName");
  const status = readStickerStatus(formData);
  const tagsValue = formData.get("editTags");
  const tags =
    typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];
  const approvalFields =
    status === "approved"
      ? { approvedById: session.user.id, approvedAt: new Date(), rejectionReason: null }
      : { approvedById: null, approvedAt: null, rejectionReason: null };

  await db
    .update(stickers)
    .set({ name, categoryId: category, tags, status, ...approvalFields })
    .where(eq(stickers.id, id));
  revalidateAdminPages();
}

export async function addCategory(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = crypto.randomUUID();
  const characterId = readText(formData, "characterId");
  const slug = readText(formData, "categoryId");
  await ensureCharacterExists(characterId);
  await ensureCategorySlugAvailable(characterId, slug);
  await db.insert(categories).values({
    id,
    name: readText(formData, "categoryName"),
    slug,
    characterId,
    createdById: session.user.id,
  });
  revalidateAdminPages();
}

export async function updateCategory(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "categoryId");
  const characterId = readText(formData, "characterId");
  const slug = readText(formData, "categorySlug");
  await ensureCharacterExists(characterId);
  await ensureCategorySlugAvailable(characterId, slug, id);
  await db
    .update(categories)
    .set({ name: readText(formData, "categoryName"), slug, characterId })
    .where(eq(categories.id, id));
  revalidateAdminPages();
}

export async function addCharacter(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const id = readText(formData, "characterId");
  const exists = await db.query.characters.findFirst({ where: eq(characters.id, id) });
  if (exists) throw new Error(`角色已存在：${id}`);
  await db.insert(characters).values({
    id,
    name: readText(formData, "characterName"),
    createdById: session.user.id,
  });
  revalidateAdminPages();
}

export async function updateCharacter(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "characterId");
  await db.update(characters).set({ name: readText(formData, "characterName") }).where(eq(characters.id, id));
  revalidateAdminPages();
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "categoryId");
  const used = await db.query.stickers.findFirst({ where: eq(stickers.categoryId, id) });
  if (used) throw new Error(`分类仍被使用，不能删除：${id}`);
  await db.delete(categories).where(eq(categories.id, id));
  revalidateAdminPages();
}

export async function deleteCharacter(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "characterId");
  const child = await db.query.categories.findFirst({ where: eq(categories.characterId, id) });
  if (child) throw new Error(`该角色下还有分类，请先删除子分类：${id}`);
  await db.delete(characters).where(eq(characters.id, id));
  revalidateAdminPages();
}

async function ensureSubcategoryExists(id: string): Promise<void> {
  const found = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!found) throw new Error(`分类不存在：${id}`);
}

function readSelectedIds(formData: FormData): Set<string> {
  const ids = formData.getAll("ids").filter((id): id is string => typeof id === "string");
  if (ids.length === 0) throw new Error("请先选择至少一张表情。");
  return new Set(ids);
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

function readStickerStatus(formData: FormData): "approved" | "pending" | "rejected" {
  const status = readText(formData, "editStatus");
  if (status === "approved" || status === "pending" || status === "rejected") return status;
  throw new Error(`无效状态：${status}`);
}

async function ensureCharacterExists(id: string): Promise<void> {
  const found = await db.query.characters.findFirst({ where: eq(characters.id, id) });
  if (!found) throw new Error(`角色不存在：${id}`);
}

async function ensureCategorySlugAvailable(characterId: string, slug: string, currentId?: string) {
  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.characterId, characterId), eq(categories.slug, slug)),
  });
  if (existing && existing.id !== currentId) {
    throw new Error(`该角色下分类 ID 已存在：${slug}`);
  }
}

function splitTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length === 0) throw new Error("请提供至少一个标签。");
  return [...new Set(tags)];
}

function revalidateAdminPages() {
  revalidateTag(CATEGORY_TREE_CACHE_TAG, "max");
  revalidateTag(CHARACTER_LIST_CACHE_TAG, "max");
  revalidatePath("/admin");
  revalidatePath("/");
}
