import { readManifest, writeManifest, findSticker } from "../lib/manifest-io.js";
import { c, log, fail } from "../lib/log.js";

export async function tagCommand(id: string, tags: string[]) {
  if (tags.length === 0) fail("至少提供一个标签");
  const m = await readManifest();
  const s = findSticker(m, id);
  if (!s) fail(`未找到 id=${id}`);
  const before = new Set(s.tags);
  for (const t of tags) before.add(t);
  s.tags = [...before];
  await writeManifest(m);
  log(c.ok(`✓ ${s.id} 现在的标签: ${s.tags.map((t) => `#${t}`).join(" ")}`));
}
