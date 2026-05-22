"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers } from "@/drizzle/schema";
import { requireEditor } from "@/lib/auth-helpers";
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
    await db.delete(stickers).where(inArray(stickers.id, idList));
  } else {
    throw new Error(`未知批量操作：${operation}`);
  }

  revalidateAdminPages();
}

export async function uploadStickers(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const category = readText(formData, "uploadCategory");
  await ensureSubcategoryExists(category);
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
        width: uploaded.width,
        height: uploaded.height,
        ext: uploaded.ext,
        hash: uploaded.hash,
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
  await requireEditor();
  const id = readText(formData, "id");
  const category = readText(formData, "editCategory");
  await ensureSubcategoryExists(category);
  const name = readText(formData, "editName");
  const tagsValue = formData.get("editTags");
  const tags =
    typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];

  await db
    .update(stickers)
    .set({ name, categoryId: category, tags })
    .where(eq(stickers.id, id));
  revalidateAdminPages();
}

export async function addCategory(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const rawId = readText(formData, "categoryId");
  const parentId = await readParentId(formData, rawId);
  const id = buildCategoryId(rawId, parentId);
  const exists = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (exists) throw new Error(`分类已存在：${id}`);
  await db.insert(categories).values({
    id,
    name: readText(formData, "categoryName"),
    parentId: parentId ?? null,
    createdById: session.user.id,
  });
  revalidateAdminPages();
}

export async function updateCategory(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "categoryId");
  const parentId = await readParentId(formData, id);
  await db
    .update(categories)
    .set({ name: readText(formData, "categoryName"), parentId: parentId ?? null })
    .where(eq(categories.id, id));
  revalidateAdminPages();
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireEditor();
  const id = readText(formData, "categoryId");
  const child = await db.query.categories.findFirst({ where: eq(categories.parentId, id) });
  if (child) throw new Error(`该角色下还有分类，请先删除子分类：${id}`);
  const used = await db.query.stickers.findFirst({ where: eq(stickers.categoryId, id) });
  if (used) throw new Error(`分类仍被使用，不能删除：${id}`);
  await db.delete(categories).where(eq(categories.id, id));
  revalidateAdminPages();
}

export async function renameTag(formData: FormData): Promise<void> {
  await requireEditor();
  const from = readText(formData, "tagFrom");
  const to = readText(formData, "tagTo");
  await db
    .update(stickers)
    .set({
      tags: sql`(SELECT ARRAY(SELECT DISTINCT CASE WHEN t = ${from} THEN ${to} ELSE t END FROM unnest(${stickers.tags}) AS t))`,
    })
    .where(sql`${from} = ANY(${stickers.tags})`);
  revalidateAdminPages();
}

export async function deleteTag(formData: FormData): Promise<void> {
  await requireEditor();
  const tag = readText(formData, "tag");
  await db
    .update(stickers)
    .set({ tags: sql`array_remove(${stickers.tags}, ${tag})` })
    .where(sql`${tag} = ANY(${stickers.tags})`);
  revalidateAdminPages();
}

async function ensureSubcategoryExists(id: string): Promise<void> {
  const found = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!found) throw new Error(`分类不存在：${id}`);
  if (!found.parentId) {
    throw new Error("不允许将贴纸挂到角色上，请选具体子分类。");
  }
}

async function ensureCategoryExists(id: string): Promise<void> {
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

async function readParentId(formData: FormData, id: string): Promise<string | undefined> {
  const value = formData.get("parentId");
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parent = await db.query.categories.findFirst({
    where: eq(categories.id, value.trim()),
  });
  if (!parent) throw new Error(`父级（角色）不存在：${value}`);
  if (parent.id === id) throw new Error("不能把自己设为父级。");
  if (parent.parentId) throw new Error("分类层级只支持两层（角色 → 分类）。");
  return parent.id;
}

function buildCategoryId(rawId: string, parentId: string | undefined) {
  if (!parentId) return rawId;
  const prefix = `${parentId}_`;
  return rawId.startsWith(prefix) ? rawId : `${prefix}${rawId}`;
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
  revalidatePath("/admin");
  revalidatePath("/");
}