import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const { db } = await import("../lib/db.js");
const { categories, characters, stickers } = await import("../drizzle/schema.js");

interface LegacyCategory {
  id: string;
  name: string;
  parentId?: string;
}
interface LegacySticker {
  id: string;
  name: string;
  src: string;
  thumb?: string;
  width: number;
  height: number;
  category: string;
  tags: string[];
  ext: "png" | "gif" | "webp" | "jpg" | "jpeg";
  hash?: string;
}
interface LegacyManifest {
  categories: LegacyCategory[];
  stickers: LegacySticker[];
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.resolve(here, "../data/stickers.json");
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as LegacyManifest;

  console.log(`读取 ${manifest.categories.length} 个分类、${manifest.stickers.length} 张贴纸`);

  const parents = manifest.categories.filter((c) => !c.parentId);
  for (const c of parents) {
    await db
      .insert(characters)
      .values({ id: c.id, name: c.name })
      .onConflictDoNothing({ target: characters.id });
  }
  const children = manifest.categories.filter((c) => c.parentId);
  for (const c of children) {
    await db
      .insert(categories)
      .values({ id: c.id, name: c.name, slug: c.id, characterId: c.parentId! })
      .onConflictDoNothing({ target: categories.id });
  }
  console.log(`✓ characters/categories 写入完成`);

  let inserted = 0;
  let skipped = 0;
  const seenHashes = new Set<string>();
  for (const s of manifest.stickers) {
    if (!s.hash) {
      console.warn(`× 跳过缺少 hash 的贴纸：${s.id}`);
      skipped += 1;
      continue;
    }
    if (seenHashes.has(s.hash)) {
      console.warn(`× 跳过重复 hash 的贴纸：${s.id}（hash=${s.hash}）`);
      skipped += 1;
      continue;
    }
    seenHashes.add(s.hash);
    const result = await db
      .insert(stickers)
      .values({
        id: s.id,
        name: s.name,
        src: s.src,
        width: s.width,
        height: s.height,
        ext: s.ext,
        hash: s.hash,
        categoryId: s.category,
        tags: s.tags,
        status: "approved",
        approvedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: stickers.id });
    if (result.length > 0) inserted += 1;
    else skipped += 1;
  }
  console.log(`✓ stickers 写入完成：新增 ${inserted}，跳过 ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
