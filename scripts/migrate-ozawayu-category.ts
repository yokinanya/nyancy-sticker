import { config as loadEnv } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import type { StickerExt } from "@/lib/types";

loadEnv({ path: ".env.local", quiet: true });

const { db } = await import("../lib/db.js");
const { categories, characters, stickers } = await import("../drizzle/schema.js");
const { previewKey, stickerKey } = await import("../lib/keys.js");
const { copy, exists, keyFromUrl, publicUrlFor } = await import("../lib/r2-core.js");

const OLD_CHARACTER_ID = "Yokina_OzawaYu";
const NEW_CHARACTER_ID = "OzawaYu";
const EMOTELAB_CATEGORY_ID = "OzawaYu";
const YUU_CATEGORY_ID = "Yokina_OzawaYu_yuu";
const EXPECTED_OLD_CATEGORY_IDS = new Set([EMOTELAB_CATEGORY_ID, YUU_CATEGORY_ID]);

const dryRun = process.argv.includes("--dry-run");

interface MigratedSticker {
  id: string;
  src: string;
  previewSrc: string | null;
  hash: string;
  ext: StickerExt;
  categoryId: string;
  targetSlug: string;
}

async function main(): Promise<void> {
  const rows = await loadRows();
  await assertExpectedState(rows);
  printPlan(rows);
  if (dryRun) return;
  await copyObjects(rows);
  await updateDatabase(rows);
  console.log("✓ OzawaYu 分类与 R2 URL 迁移完成，旧 R2 对象已保留。");
}

async function loadRows(): Promise<MigratedSticker[]> {
  const rows = await db
    .select({
      id: stickers.id,
      src: stickers.src,
      previewSrc: stickers.previewSrc,
      hash: stickers.hash,
      ext: stickers.ext,
      categoryId: stickers.categoryId,
    })
    .from(stickers)
    .where(inArray(stickers.categoryId, [EMOTELAB_CATEGORY_ID, YUU_CATEGORY_ID]))
    .orderBy(stickers.id);
  return rows.map((row) => ({
    ...row,
    targetSlug: row.categoryId === EMOTELAB_CATEGORY_ID ? "EmoteLab" : "other",
  }));
}

async function assertExpectedState(rows: readonly MigratedSticker[]): Promise<void> {
  const oldCharacter = await db.query.characters.findFirst({
    where: eq(characters.id, OLD_CHARACTER_ID),
  });
  if (!oldCharacter) throw new Error(`旧角色不存在：${OLD_CHARACTER_ID}`);
  const oldCategories = await db.query.categories.findMany({
    where: eq(categories.characterId, OLD_CHARACTER_ID),
  });
  const unexpected = oldCategories.filter((category) => !EXPECTED_OLD_CATEGORY_IDS.has(category.id));
  if (unexpected.length > 0) {
    throw new Error(`旧角色下存在未预期分类：${unexpected.map((c) => c.id).join(", ")}`);
  }
  const missing = [...EXPECTED_OLD_CATEGORY_IDS].filter(
    (id) => !oldCategories.some((category) => category.id === id),
  );
  if (missing.length > 0) throw new Error(`缺少待迁移分类：${missing.join(", ")}`);
  if (rows.length === 0) console.warn("没有找到需要迁移 URL 的贴纸。");
}

function printPlan(rows: readonly MigratedSticker[]): void {
  const emotelab = rows.filter((row) => row.targetSlug === "EmoteLab").length;
  const other = rows.filter((row) => row.targetSlug === "other").length;
  console.log(`${dryRun ? "[dry-run] " : ""}OzawaYu 迁移计划`);
  console.log(`- ${OLD_CHARACTER_ID}.${EMOTELAB_CATEGORY_ID} -> ${NEW_CHARACTER_ID}.EmoteLab：${emotelab} 张`);
  console.log(`- ${OLD_CHARACTER_ID}.${YUU_CATEGORY_ID} -> ${NEW_CHARACTER_ID}.other：${other} 张`);
  rows.slice(0, 10).forEach((row) => {
    console.log(`  ${row.id}: ${objectKey(row.src)} -> ${targetOriginalKey(row)}`);
  });
  if (rows.length > 10) console.log(`  ...另有 ${rows.length - 10} 张`);
}

async function copyObjects(rows: readonly MigratedSticker[]): Promise<void> {
  for (const row of rows) {
    await copyIfMissing(requiredObjectKey(row.src), targetOriginalKey(row));
    if (row.previewSrc) await copyIfMissing(requiredObjectKey(row.previewSrc), targetPreviewKey(row));
    await assertTargetExists(row);
    console.log(`✓ copied ${row.id}`);
  }
}

async function copyIfMissing(sourceKey: string, targetKey: string): Promise<void> {
  if (!(await exists(sourceKey))) throw new Error(`源对象不存在：${sourceKey}`);
  if (await exists(targetKey)) return;
  await copy(sourceKey, targetKey);
}

async function assertTargetExists(row: MigratedSticker): Promise<void> {
  const keys = [targetOriginalKey(row), row.previewSrc ? targetPreviewKey(row) : null].filter(
    (key): key is string => Boolean(key),
  );
  for (const key of keys) {
    if (!(await exists(key))) throw new Error(`目标对象复制后不存在：${key}`);
  }
}

async function updateDatabase(rows: readonly MigratedSticker[]): Promise<void> {
  const sourceCategory = await db.query.categories.findFirst({
    where: eq(categories.id, EMOTELAB_CATEGORY_ID),
  });
  await db
    .insert(characters)
    .values({
      id: NEW_CHARACTER_ID,
      name: sourceCategory?.name ?? "小沢幽",
      createdById: sourceCategory?.createdById ?? null,
    })
    .onConflictDoUpdate({
      target: characters.id,
      set: { name: sourceCategory?.name ?? "小沢幽" },
    });
  await db
    .update(categories)
    .set({ characterId: NEW_CHARACTER_ID, slug: "EmoteLab", name: "EmoteLab" })
    .where(eq(categories.id, EMOTELAB_CATEGORY_ID));
  await db
    .update(categories)
    .set({ characterId: NEW_CHARACTER_ID, slug: "other", name: "其他" })
    .where(eq(categories.id, YUU_CATEGORY_ID));
  for (const row of rows) {
    await db
      .update(stickers)
      .set({ src: publicUrlFor(targetOriginalKey(row)), previewSrc: targetPreviewUrl(row) })
      .where(eq(stickers.id, row.id));
  }
  await db.delete(characters).where(eq(characters.id, OLD_CHARACTER_ID));
}

function targetPreviewUrl(row: MigratedSticker): string | null {
  return row.previewSrc ? publicUrlFor(targetPreviewKey(row)) : null;
}

function targetOriginalKey(row: MigratedSticker): string {
  return stickerKey(targetCategoryRef(row), row.hash, row.ext);
}

function targetPreviewKey(row: MigratedSticker): string {
  return previewKey(targetCategoryRef(row), row.hash, row.ext === "gif" ? "gif" : "webp");
}

function targetCategoryRef(row: MigratedSticker) {
  return { characterId: NEW_CHARACTER_ID, slug: row.targetSlug };
}

function requiredObjectKey(url: string): string {
  const key = keyFromUrl(url);
  if (!key) throw new Error(`无法从 URL 解析 R2 key：${url}`);
  return key;
}

function objectKey(url: string): string {
  return keyFromUrl(url) ?? url;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
