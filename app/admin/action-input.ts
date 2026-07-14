import "server-only";

import { and, eq } from "drizzle-orm";
import { categories, characters } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { parseRequiredInteger } from "@/lib/form-values";
import type { CharacterVisibility } from "@/lib/types";

export async function requireCategory(id: string) {
  const found = await db.query.categories.findFirst({
    columns: { id: true, characterId: true },
    where: eq(categories.id, id),
  });
  if (!found) throw new Error(`分类不存在：${id}`);
  return found;
}

export async function requireCharacter(id: string): Promise<void> {
  const found = await db.query.characters.findFirst({
    columns: { id: true },
    where: eq(characters.id, id),
  });
  if (!found) throw new Error(`角色不存在：${id}`);
}

export async function ensureCategorySlugAvailable(options: {
  readonly characterId: string;
  readonly slug: string;
  readonly currentId?: string;
}): Promise<void> {
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(categories.characterId, options.characterId),
      eq(categories.slug, options.slug),
    ),
  });
  if (existing && existing.id !== options.currentId) {
    throw new Error(`该角色下分类短名已存在：${options.slug}`);
  }
}

export function readSelectedIds(formData: FormData): string[] {
  const ids = formData
    .getAll("ids")
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) throw new Error("请先选择至少一张表情。");
  return [...new Set(ids)];
}

export function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

export function readInteger(formData: FormData, key: string): number {
  return parseRequiredInteger(readText(formData, key), key);
}

export function readStickerStatus(
  formData: FormData,
): "approved" | "pending" | "rejected" {
  const status = readText(formData, "editStatus");
  if (status === "approved" || status === "pending" || status === "rejected") {
    return status;
  }
  throw new Error(`无效状态：${status}`);
}

export function readOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

export function readCharacterVisibility(formData: FormData): CharacterVisibility {
  const value = readText(formData, "characterVisibility");
  if (value === "public" || value === "hidden" || value === "admin_only") {
    return value;
  }
  throw new Error(`无效角色可见性：${value}`);
}

export function splitTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length === 0) throw new Error("请提供至少一个标签。");
  return [...new Set(tags)];
}
