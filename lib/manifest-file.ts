import "server-only";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Category, Manifest, Sticker, StickerExt } from "@/lib/types";

const MANIFEST_PATH = path.join(process.cwd(), "data", "stickers.json");
const STICKER_EXTS: readonly StickerExt[] = ["png", "gif", "webp", "jpg", "jpeg"];

export async function readManifestFile(): Promise<Manifest> {
  const raw = await readFile(MANIFEST_PATH, "utf8");
  return parseManifest(raw);
}

export async function writeManifestFile(manifest: Manifest): Promise<void> {
  const sorted = sortManifest(manifest);
  const tmpPath = `${MANIFEST_PATH}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  await rename(tmpPath, MANIFEST_PATH);
}

export function parseManifest(raw: string): Manifest {
  const value = JSON.parse(raw) as unknown;
  assertManifest(value);
  return value;
}

export function assertLocalAdmin() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("本地管理页只允许在 development 环境使用。");
  }
}

function assertManifest(value: unknown): asserts value is Manifest {
  if (!isRecord(value)) throw new Error("manifest 必须是对象。");
  if (!Array.isArray(value.categories)) throw new Error("categories 必须是数组。");
  if (!Array.isArray(value.stickers)) throw new Error("stickers 必须是数组。");
  value.categories.forEach(assertCategory);
  value.stickers.forEach(assertSticker);
  assertUniqueIds(value.categories, "分类");
  assertCategoryParents(value.categories);
  assertUniqueIds(value.stickers, "表情");
  assertCategoryRefs(value.stickers, value.categories);
}

function assertCategory(value: unknown, index: number): asserts value is Category {
  if (!isRecord(value)) throw new Error(`categories[${index}] 必须是对象。`);
  assertString(value.id, `categories[${index}].id`);
  assertString(value.name, `categories[${index}].name`);
  if (value.parentId !== undefined) {
    assertString(value.parentId, `categories[${index}].parentId`);
  }
}

function assertSticker(value: unknown, index: number): asserts value is Sticker {
  if (!isRecord(value)) throw new Error(`stickers[${index}] 必须是对象。`);
  assertString(value.id, `stickers[${index}].id`);
  assertString(value.name, `stickers[${index}].name`);
  assertString(value.src, `stickers[${index}].src`);
  assertNumber(value.width, `stickers[${index}].width`);
  assertNumber(value.height, `stickers[${index}].height`);
  assertString(value.category, `stickers[${index}].category`);
  assertTags(value.tags, index);
  assertExt(value.ext, index);
  if (value.thumb !== undefined) assertString(value.thumb, `stickers[${index}].thumb`);
  if (value.hash !== undefined) assertString(value.hash, `stickers[${index}].hash`);
}

function assertTags(value: unknown, index: number) {
  if (!Array.isArray(value)) throw new Error(`stickers[${index}].tags 必须是数组。`);
  value.forEach((tag, tagIndex) => {
    assertString(tag, `stickers[${index}].tags[${tagIndex}]`);
  });
}

function assertExt(value: unknown, index: number): asserts value is StickerExt {
  if (typeof value !== "string" || !STICKER_EXTS.includes(value as StickerExt)) {
    throw new Error(`stickers[${index}].ext 必须是 png/gif/webp/jpg/jpeg。`);
  }
}

function assertCategoryRefs(stickers: readonly Sticker[], categories: readonly Category[]) {
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const sticker of stickers) {
    if (!categoryIds.has(sticker.category)) {
      throw new Error(`表情 ${sticker.id} 引用了不存在的分类 ${sticker.category}。`);
    }
  }
}

function sortManifest(manifest: Manifest): Manifest {
  return {
    categories: [...manifest.categories].sort(compareCategories),
    stickers: [...manifest.stickers].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function assertCategoryParents(categories: readonly Category[]) {
  const ids = new Set(categories.map((category) => category.id));
  for (const category of categories) {
    if (!category.parentId) continue;
    if (category.parentId === category.id) {
      throw new Error(`分类 ${category.id} 不能把自己设为父分类。`);
    }
    if (!ids.has(category.parentId)) {
      throw new Error(`分类 ${category.id} 引用了不存在的父分类 ${category.parentId}。`);
    }
    if (categories.find((item) => item.id === category.parentId)?.parentId) {
      throw new Error(`分类 ${category.id} 不能挂到二级分类下面。`);
    }
    assertNoCategoryCycle(category, categories);
  }
}

function assertNoCategoryCycle(category: Category, categories: readonly Category[]) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const seen = new Set<string>();
  let parentId = category.parentId;
  while (parentId) {
    if (seen.has(parentId)) throw new Error(`分类 ${category.id} 存在循环父级。`);
    seen.add(parentId);
    parentId = byId.get(parentId)?.parentId;
  }
}

function compareCategories(a: Category, b: Category) {
  const groupA = a.parentId ?? a.id;
  const groupB = b.parentId ?? b.id;
  if (groupA !== groupB) return groupA.localeCompare(groupB);
  if (a.parentId && !b.parentId) return 1;
  if (!a.parentId && b.parentId) return -1;
  return a.id.localeCompare(b.id);
}

function assertUniqueIds(items: readonly { id: string }[], label: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`${label} id 重复：${item.id}`);
    seen.add(item.id);
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} 必须是非空字符串。`);
  }
}

function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} 必须是正整数。`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
