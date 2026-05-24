import { config as loadEnv } from "dotenv";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { StickerExt } from "@/lib/types";

loadEnv({ path: ".env.local", quiet: true });

const { db } = await import("../lib/db.js");
const { categories, stickers } = await import("../drizzle/schema.js");
const { previewKey } = await import("../lib/keys.js");
const { generateStickerPreview, previewExtFor } = await import("../lib/preview-core.js");
const { exists, publicUrlFor, upload } = await import("../lib/r2-core.js");

const BACKFILL_STATUSES = ["approved", "pending"] as const;

async function main(): Promise<void> {
  const rows = await loadRows();
  console.log(`需要生成预览图：${rows.length} 张`);

  for (const row of rows) {
    const key = previewKey(
      { characterId: row.characterId, slug: row.slug },
      row.hash,
      previewExtFor(row.ext),
    );
    const previewSrc = await ensurePreview(row.src, key, row.ext);
    await db.update(stickers).set({ previewSrc }).where(eq(stickers.id, row.id));
    console.log(`✓ ${row.id} -> ${key}`);
  }

  await assertNoMissingPreview();
  console.log("✓ previewSrc backfill 完成");
}

async function loadRows() {
  return db
    .select({
      id: stickers.id,
      src: stickers.src,
      hash: stickers.hash,
      ext: stickers.ext,
      characterId: categories.characterId,
      slug: categories.slug,
    })
    .from(stickers)
    .innerJoin(categories, eq(stickers.categoryId, categories.id))
    .where(
      and(
        inArray(stickers.status, BACKFILL_STATUSES),
        or(
          sql`${stickers.previewSrc} IS NULL`,
          and(eq(stickers.ext, "gif"), sql`${stickers.previewSrc} LIKE ${"%/previews/%-240.webp"}`),
        ),
      ),
    )
    .orderBy(stickers.id);
}

async function ensurePreview(
  src: string,
  key: string,
  ext: StickerExt,
): Promise<string> {
  if (await exists(key)) return publicUrlFor(key);
  const original = await fetchOriginal(src);
  const preview = await generateStickerPreview(original, ext);
  return upload(key, preview.buffer, preview.ext);
}

async function fetchOriginal(src: string): Promise<Buffer> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`下载原图失败：${src}，HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function assertNoMissingPreview(): Promise<void> {
  const missing = await db
    .select({ id: stickers.id })
    .from(stickers)
    .where(and(inArray(stickers.status, BACKFILL_STATUSES), sql`${stickers.previewSrc} IS NULL`));
  if (missing.length > 0) {
    throw new Error(`仍有 ${missing.length} 张贴纸缺少 previewSrc。`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
