import { promises as fs } from "node:fs";
import path from "node:path";
import { input, select, confirm } from "@inquirer/prompts";
import { nanoid } from "nanoid";
import { readManifest, writeManifest, uniqueId } from "../lib/manifest-io.js";
import { inspectImage, extOf } from "../lib/image.js";
import { exists, upload, publicUrlFor } from "../lib/r2.js";
import { c, log, fail } from "../lib/log.js";
import type { Sticker } from "../../lib/types.js";

interface Options {
  category?: string;
  yes?: boolean;
  dryRun?: boolean;
  /** 用一级子目录名作为 category id（必须在 manifest 中已存在） */
  categoryFromDir?: boolean;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    const entries = await fs.readdir(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && extOf(full)) out.push(full);
    }
  }
  return out.sort();
}

export async function bulkImportCommand(dir: string, opts: Options) {
  const root = path.resolve(dir);
  const files = await walk(root);
  if (files.length === 0) fail(`目录里没有可识别的图片: ${root}`);
  log(c.bold(`扫描到 ${files.length} 张图片`));

  const manifest = await readManifest();
  let added = 0;
  let skipped = 0;

  for (const file of files) {
    const rel = path.relative(root, file);
    log(c.bold(`\n→ ${rel}`));
    const info = await inspectImage(file).catch((e) => {
      log(c.err(`  读取失败: ${(e as Error).message}`));
      skipped++;
      return null;
    });
    if (!info) continue;

    // 推断分类
    let category: string;
    const topDir = rel.split(path.sep)[0];
    if (opts.category) {
      category = opts.category;
    } else if (opts.categoryFromDir && manifest.categories.some((c) => c.id === topDir)) {
      category = topDir;
    } else if (opts.yes) {
      category = manifest.categories[0]?.id ?? fail("无可用分类");
    } else {
      category = await select({
        message: `${rel} 的分类`,
        choices: manifest.categories.map((c) => ({
          name: `${c.emoji ?? ""}${c.name}`,
          value: c.id,
        })),
        default: manifest.categories.some((c) => c.id === topDir) ? topDir : undefined,
      });
    }

    const baseName = path.basename(file, path.extname(file));
    const name = opts.yes
      ? baseName
      : await input({ message: "名称", default: baseName });

    const tags = opts.yes
      ? []
      : (await input({ message: "标签（逗号分隔，可空）", default: "" }))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const key = `${category}/${info.hash}.${info.ext}`;
    let src: string;
    if (opts.dryRun) {
      src = publicUrlFor(key);
    } else {
      const has = await exists(key).catch((e) => fail("R2 检查失败", e));
      if (has) {
        log(c.dim(`  ⏭  R2 已存在: ${key}`));
        src = publicUrlFor(key);
      } else {
        src = await upload(key, info.buffer, info.ext).catch((e) => fail("R2 上传失败", e));
        log(c.dim(`  ⬆  已上传`));
      }
    }

    // 同 hash 已在 manifest 中：跳过
    const dup = manifest.stickers.find((s) => s.hash === info.hash);
    if (dup) {
      log(c.warn(`  ⚠  manifest 里已存在相同 hash 的条目: ${dup.id}`));
      skipped++;
      continue;
    }

    const id = uniqueId(manifest, nanoid(8));
    const sticker: Sticker = {
      id,
      name,
      src,
      width: info.width,
      height: info.height,
      category,
      tags,
      ext: info.ext,
      hash: info.hash,
    };
    manifest.stickers.push(sticker);
    added++;
    log(c.ok(`  ✓ ${id}`));
  }

  if (!opts.dryRun) {
    if (!opts.yes) {
      const ok = await confirm({
        message: `准备写入 ${added} 张（跳过 ${skipped} 张），确认？`,
        default: true,
      });
      if (!ok) fail("已取消");
    }
    await writeManifest(manifest);
  }
  log(c.ok(`\n✓ 完成：新增 ${added}，跳过 ${skipped}`));
}
