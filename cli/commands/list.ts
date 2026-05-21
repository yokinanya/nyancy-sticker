import { readManifest } from "../lib/manifest-io.js";
import { c, log } from "../lib/log.js";

interface Options {
  category?: string;
  tag?: string;
  limit?: number;
}

export async function listCommand(opts: Options) {
  const m = await readManifest();
  let pool = m.stickers;
  if (opts.category) pool = pool.filter((s) => s.category === opts.category);
  if (opts.tag) pool = pool.filter((s) => s.tags.includes(opts.tag!));
  const limit = opts.limit ?? 50;
  const shown = pool.slice(0, limit);

  log(c.bold(`共 ${pool.length} 张${pool.length > limit ? `（显示前 ${limit}）` : ""}`));
  log("");
  log([pad("ID", 12), pad("名称", 18), pad("分类", 10), "标签"].join(" "));
  log(c.dim("─".repeat(72)));
  for (const s of shown) {
    log(
      [
        pad(s.id, 12),
        pad(s.name, 18),
        pad(s.category, 10),
        s.tags.map((t) => `#${t}`).join(" "),
      ].join(" "),
    );
  }
}

function pad(s: string, n: number): string {
  // 考虑中文宽度，粗略 each CJK = 2
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return s + " ".repeat(Math.max(0, n - w));
}
