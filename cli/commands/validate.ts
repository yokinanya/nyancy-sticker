import { readManifest } from "../lib/manifest-io.js";
import { c, log } from "../lib/log.js";

export async function validateCommand(opts: { checkRemote?: boolean } = {}) {
  const m = await readManifest();
  const errors: string[] = [];
  const warns: string[] = [];

  // id 唯一
  const seen = new Map<string, number>();
  for (const s of m.stickers) seen.set(s.id, (seen.get(s.id) ?? 0) + 1);
  for (const [id, count] of seen) {
    if (count > 1) errors.push(`重复 id: ${id} (×${count})`);
  }

  // 分类引用完整
  const catIds = new Set(m.categories.map((c) => c.id));
  for (const s of m.stickers) {
    if (!catIds.has(s.category))
      errors.push(`${s.id} 引用了不存在的分类: ${s.category}`);
    if (!s.src) errors.push(`${s.id} 没有 src`);
    if (!s.width || !s.height) warns.push(`${s.id} 缺少 width/height`);
  }

  // hash 唯一性（如果存在）
  const hashes = new Map<string, string[]>();
  for (const s of m.stickers) {
    if (!s.hash) continue;
    const arr = hashes.get(s.hash) ?? [];
    arr.push(s.id);
    hashes.set(s.hash, arr);
  }
  for (const [h, ids] of hashes) {
    if (ids.length > 1) warns.push(`相同 hash ${h}: ${ids.join(", ")}`);
  }

  // 可选：检查远程 URL 可达
  if (opts.checkRemote) {
    log(c.dim("正在检查远程 URL ..."));
    let i = 0;
    for (const s of m.stickers) {
      i++;
      process.stdout.write(`\r  [${i}/${m.stickers.length}]`);
      try {
        const r = await fetch(s.src, { method: "HEAD" });
        if (!r.ok) errors.push(`${s.id} HEAD ${r.status}: ${s.src}`);
      } catch (e) {
        errors.push(`${s.id} fetch 失败: ${(e as Error).message}`);
      }
    }
    process.stdout.write("\n");
  }

  if (warns.length) {
    log(c.warn(`\n${warns.length} 条警告:`));
    for (const w of warns) log(`  · ${w}`);
  }
  if (errors.length) {
    log(c.err(`\n${errors.length} 条错误:`));
    for (const e of errors) log(`  · ${e}`);
    process.exit(1);
  }
  log(c.ok(`\n✓ 校验通过：${m.categories.length} 个分类、${m.stickers.length} 张表情`));
}
