import { config as loadEnv } from "dotenv";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

loadEnv({ path: ".env.local", quiet: true });

const { db } = await import("../lib/db.js");
const { stickers } = await import("../drizzle/schema.js");
const { generateVisualHash, generateVisualHashV2 } = await import("../lib/visual-hash.js");

const BACKFILL_STATUSES = ["approved", "pending"] as const;

async function main(): Promise<void> {
  const rows = await loadRows();
  console.log(`需要补齐 visualHash / visualHashV2：${rows.length} 张`);

  for (const row of rows) {
    const original = await fetchOriginal(row.src);
    const values = await missingHashValues(row, original);
    await db.update(stickers).set(values).where(eq(stickers.id, row.id));
    console.log(`✓ ${row.id} -> ${Object.keys(values).join(", ")}`);
  }

  await assertNoMissingVisualHash();
  console.log("✓ visualHash backfill 完成");
}

function loadRows() {
  return db
    .select({ id: stickers.id, src: stickers.src, visualHash: stickers.visualHash })
    .from(stickers)
    .where(
      and(
        inArray(stickers.status, BACKFILL_STATUSES),
        or(isNull(stickers.visualHash), isNull(stickers.visualHashV2)),
      ),
    )
    .orderBy(stickers.id);
}

async function missingHashValues(
  row: Awaited<ReturnType<typeof loadRows>>[number],
  original: Buffer,
) {
  const visualHash = row.visualHash ?? (await generateVisualHash(original));
  const visualHashV2 = await generateVisualHashV2(original);
  return { visualHash, visualHashV2 };
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
    .where(
      and(
        inArray(stickers.status, BACKFILL_STATUSES),
        or(isNull(stickers.visualHash), isNull(stickers.visualHashV2)),
      ),
    );
  if (missing.length > 0) {
    throw new Error(`仍有 ${missing.length} 张贴纸缺少 visualHash 或 visualHashV2。`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
