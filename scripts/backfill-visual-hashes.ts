import { config as loadEnv } from "dotenv";
import { and, eq, inArray, isNull } from "drizzle-orm";

loadEnv({ path: ".env.local", quiet: true });

const { db } = await import("../lib/db.js");
const { stickers } = await import("../drizzle/schema.js");
const { generateVisualHash } = await import("../lib/visual-hash.js");

const BACKFILL_STATUSES = ["approved", "pending"] as const;

async function main(): Promise<void> {
  const rows = await loadRows();
  console.log(`需要补齐 visualHash：${rows.length} 张`);

  for (const row of rows) {
    const original = await fetchOriginal(row.src);
    const visualHash = await generateVisualHash(original);
    await db.update(stickers).set({ visualHash }).where(eq(stickers.id, row.id));
    console.log(`✓ ${row.id} -> ${visualHash}`);
  }

  await assertNoMissingVisualHash();
  console.log("✓ visualHash backfill 完成");
}

function loadRows() {
  return db
    .select({ id: stickers.id, src: stickers.src })
    .from(stickers)
    .where(and(inArray(stickers.status, BACKFILL_STATUSES), isNull(stickers.visualHash)))
    .orderBy(stickers.id);
}

async function fetchOriginal(src: string): Promise<Buffer> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`下载原图失败：${src}，HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function assertNoMissingVisualHash(): Promise<void> {
  const missing = await db
    .select({ id: stickers.id })
    .from(stickers)
    .where(and(inArray(stickers.status, BACKFILL_STATUSES), isNull(stickers.visualHash)));
  if (missing.length > 0) {
    throw new Error(`仍有 ${missing.length} 张贴纸缺少 visualHash。`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
