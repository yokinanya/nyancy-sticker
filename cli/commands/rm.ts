import { confirm } from "@inquirer/prompts";
import { readManifest, writeManifest, findSticker } from "../lib/manifest-io.js";
import { keyFromUrl, remove } from "../lib/r2.js";
import { c, log, fail } from "../lib/log.js";

interface Options {
  purge?: boolean;
  yes?: boolean;
}

export async function rmCommand(id: string, opts: Options) {
  const m = await readManifest();
  const s = findSticker(m, id);
  if (!s) fail(`未找到 id=${id}`);

  if (!opts.yes) {
    const ok = await confirm({
      message: `删除 ${s.id} · ${s.name}${opts.purge ? "（含 R2 对象）" : ""}？`,
      default: false,
    });
    if (!ok) fail("已取消");
  }

  m.stickers = m.stickers.filter((x) => x.id !== id);
  await writeManifest(m);
  log(c.ok(`✓ 已从 manifest 移除 ${id}`));

  if (opts.purge) {
    const key = keyFromUrl(s.src);
    if (!key) {
      log(c.warn("⚠  src 不是 R2 域名，跳过对象删除"));
      return;
    }
    // 检查是否有其它条目复用同一 key
    const reused = m.stickers.some((x) => keyFromUrl(x.src) === key);
    if (reused) {
      log(c.warn(`⚠  其它条目仍引用 ${key}，跳过对象删除`));
      return;
    }
    await remove(key).catch((e) => fail("R2 删除失败", e));
    log(c.ok(`✓ 已删除 R2 对象 ${key}`));
  }
}
