"use server";

import { revalidatePath } from "next/cache";
import {
  assertLocalAdmin,
  parseManifest,
  readManifestFile,
  writeManifestFile,
} from "@/lib/manifest-file";
import { addUploadedFiles } from "@/lib/admin-upload";
import type { Sticker } from "@/lib/types";

export interface AdminSaveState {
  ok: boolean;
  message: string;
}

export async function saveManifest(
  _state: AdminSaveState,
  formData: FormData,
): Promise<AdminSaveState> {
  try {
    assertLocalAdmin();
    const raw = formData.get("manifest");
    if (typeof raw !== "string") throw new Error("缺少 manifest 表单字段。");
    const manifest = parseManifest(raw);
    await writeManifestFile(manifest);
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true, message: "已保存 data/stickers.json。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败。",
    };
  }
}

export async function bulkUpdateStickers(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const ids = readSelectedIds(formData);
  const operation = readText(formData, "operation");
  const manifest = await readManifestFile();

  if (operation === "category") {
    const category = readText(formData, "category");
    if (!manifest.categories.some((item) => item.id === category)) {
      throw new Error(`分类不存在：${category}`);
    }
    manifest.stickers = manifest.stickers.map((sticker) =>
      ids.has(sticker.id) ? { ...sticker, category } : sticker,
    );
  } else if (operation === "add-tags") {
    const tags = splitTags(readText(formData, "tags"));
    manifest.stickers = manifest.stickers.map((sticker) =>
      ids.has(sticker.id)
        ? { ...sticker, tags: [...new Set([...sticker.tags, ...tags])] }
        : sticker,
    );
  } else if (operation === "remove-tags") {
    const tags = new Set(splitTags(readText(formData, "tags")));
    manifest.stickers = manifest.stickers.map((sticker) =>
      ids.has(sticker.id)
        ? { ...sticker, tags: sticker.tags.filter((tag) => !tags.has(tag)) }
        : sticker,
    );
  } else if (operation === "delete") {
    manifest.stickers = manifest.stickers.filter((sticker) => !ids.has(sticker.id));
  } else {
    throw new Error(`未知批量操作：${operation}`);
  }

  await writeManifestFile(manifest);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function uploadStickers(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const manifest = await readManifestFile();
  const category = readText(formData, "uploadCategory");
  if (!manifest.categories.some((item) => item.id === category)) {
    throw new Error(`分类不存在：${category}`);
  }
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);
  if (files.length === 0) throw new Error("请选择至少一个图片文件。");
  const tagsValue = formData.get("uploadTags");
  const tags = typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];
  const nextManifest = await addUploadedFiles(manifest, files, { category, tags });
  await writeManifestFile(nextManifest);
  revalidateAdminPages();
}

export async function updateSticker(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const id = readText(formData, "id");
  const manifest = await readManifestFile();
  const category = readText(formData, "editCategory");
  if (!manifest.categories.some((item) => item.id === category)) {
    throw new Error(`分类不存在：${category}`);
  }
  manifest.stickers = manifest.stickers.map((sticker) =>
    sticker.id === id ? readEditedSticker(sticker, formData, category) : sticker,
  );
  await writeManifestFile(manifest);
  revalidateAdminPages();
}

export async function addCategory(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const manifest = await readManifestFile();
  const rawId = readText(formData, "categoryId");
  const parentId = readParentId(formData, manifest.categories, rawId);
  const id = buildCategoryId(rawId, parentId);
  if (manifest.categories.some((item) => item.id === id)) {
    throw new Error(`分类已存在：${id}`);
  }
  manifest.categories = [
    ...manifest.categories,
    {
      id,
      name: readText(formData, "categoryName"),
      parentId,
    },
  ];
  await writeManifestFile(manifest);
  revalidateAdminPages();
}

export async function updateCategory(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const id = readText(formData, "categoryId");
  const manifest = await readManifestFile();
  manifest.categories = manifest.categories.map((category) =>
    category.id === id
      ? {
          id,
          name: readText(formData, "categoryName"),
          parentId: readParentId(formData, manifest.categories, id),
        }
      : category,
  );
  await writeManifestFile(manifest);
  revalidateAdminPages();
}

export async function deleteCategory(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const id = readText(formData, "categoryId");
  const manifest = await readManifestFile();
  if (manifest.categories.some((category) => category.parentId === id)) {
    throw new Error(`分类还有二级分类，不能删除：${id}`);
  }
  if (manifest.stickers.some((sticker) => sticker.category === id)) {
    throw new Error(`分类仍被使用，不能删除：${id}`);
  }
  manifest.categories = manifest.categories.filter((category) => category.id !== id);
  await writeManifestFile(manifest);
  revalidateAdminPages();
}

export async function renameTag(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const from = readText(formData, "tagFrom");
  const to = readText(formData, "tagTo");
  const manifest = await readManifestFile();
  manifest.stickers = manifest.stickers.map((sticker) => ({
    ...sticker,
    tags: [...new Set(sticker.tags.map((tag) => (tag === from ? to : tag)))],
  }));
  await writeManifestFile(manifest);
  revalidateAdminPages();
}

export async function deleteTag(formData: FormData): Promise<void> {
  assertLocalAdmin();
  const tag = readText(formData, "tag");
  const manifest = await readManifestFile();
  manifest.stickers = manifest.stickers.map((sticker) => ({
    ...sticker,
    tags: sticker.tags.filter((item) => item !== tag),
  }));
  await writeManifestFile(manifest);
  revalidateAdminPages();
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

function readParentId(formData: FormData, categories: { id: string; parentId?: string }[], id: string) {
  const value = formData.get("parentId");
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parent = categories.find((category) => category.id === value.trim());
  if (!parent) throw new Error(`父分类不存在：${value}`);
  if (parent.id === id) throw new Error("不能把自己设为父分类。");
  if (parent.parentId) throw new Error("只支持一级分类和二级分类。");
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

function readEditedSticker(sticker: Sticker, formData: FormData, category: string): Sticker {
  return {
    ...sticker,
    name: readText(formData, "editName"),
    category,
    tags: splitOptionalTags(formData.get("editTags")),
  };
}

function splitOptionalTags(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  return splitTags(value);
}

function revalidateAdminPages() {
  revalidatePath("/admin");
  revalidatePath("/");
}
