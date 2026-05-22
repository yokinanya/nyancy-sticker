"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers } from "@/drizzle/schema";
import { requireUser } from "@/lib/auth-helpers";
import { CATEGORY_TREE_CACHE_TAG } from "@/lib/queries/categories";
import { uploadStickerFile } from "@/lib/upload";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,31}$/i;
const NAME_MAX = 24;

export async function createSubmission(formData: FormData): Promise<void> {
  const session = await requireUser();

  const category = readText(formData, "category");
  const name = readText(formData, "name");
  const tagsValue = formData.get("tags");
  const tags = typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("请上传一张图片文件。");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("仅支持 PNG / JPG / GIF / WebP。");
  if (file.size === 0) throw new Error("文件内容为空。");
  if (file.size > MAX_SIZE_BYTES) throw new Error("文件过大（>8MB）。");

  const found = await db.query.categories.findFirst({ where: eq(categories.id, category) });
  if (!found) throw new Error(`分类不存在：${category}`);
  if (!found.parentId) throw new Error("必须选择具体子分类，不能直接挂到角色下。");

  const uploaded = await uploadStickerFile(file, category);

  try {
    await db.insert(stickers).values({
      id: uploaded.hash,
      name,
      src: uploaded.src,
      width: uploaded.width,
      height: uploaded.height,
      ext: uploaded.ext,
      hash: uploaded.hash,
      categoryId: category,
      tags,
      status: "pending",
      submittedById: session.user.id,
    });
  } catch (err) {
    if (err instanceof Error && /sticker_hash_active_idx|duplicate key/i.test(err.message)) {
      throw new Error("这张图已经存在或已在审核队列里。");
    }
    throw err;
  }
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

/**
 * 投稿者新建子分类（必须挂在某个一级角色下）。
 * 任何登录用户都可调用，但严格校验 slug 与名字。
 */
export async function createSubcategoryForSubmit(
  formData: FormData,
): Promise<{ id: string; name: string }> {
  const session = await requireUser();
  const parentId = readText(formData, "parentId");
  const rawId = readText(formData, "categoryId");
  const name = readText(formData, "categoryName");

  if (!SLUG_RE.test(rawId)) {
    throw new Error("分类 ID 仅允许字母数字下划线和短横线，长度 2-32，且以字母数字开头。");
  }
  if (name.length > NAME_MAX) {
    throw new Error(`分类名最长 ${NAME_MAX} 个字符。`);
  }

  const parent = await db.query.categories.findFirst({ where: eq(categories.id, parentId) });
  if (!parent) throw new Error(`角色不存在：${parentId}`);
  if (parent.parentId) throw new Error("只能挂到角色下面。");

  const id = rawId.startsWith(`${parentId}_`) ? rawId : `${parentId}_${rawId}`;
  const existing = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (existing) throw new Error(`分类已存在：${id}`);

  await db.insert(categories).values({
    id,
    name,
    parentId,
    createdById: session.user.id,
  });
  revalidateTag(CATEGORY_TREE_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/admin");
  return { id, name };
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
