import path from "node:path";
import { input, select, checkbox, confirm } from "@inquirer/prompts";
import { nanoid } from "nanoid";
import {
  readManifest,
  writeManifest,
  uniqueId,
  findCategory,
} from "../lib/manifest-io.js";
import { inspectImage } from "../lib/image.js";
import { exists, upload, publicUrlFor } from "../lib/r2.js";
import { c, log, fail } from "../lib/log.js";
import type { Sticker } from "../../lib/types.js";

interface Options {
  category?: string;
  tags?: string;
  name?: string;
  yes?: boolean;
  dryRun?: boolean;
}

export async function addCommand(files: string[], opts: Options) {
  if (files.length === 0) fail("请至少提供一个图片文件");
  const manifest = await readManifest();
  const categories = manifest.categories;

  for (const file of files) {
    log(c.bold(`\n→ ${file}`));
    const abs = path.resolve(file);
    const info = await inspectImage(abs).catch((e) => {
      fail(`读取图片失败: ${file}`, e);
    });

    const baseName = path.basename(abs, path.extname(abs));
    const name =
      opts.name ??
      (opts.yes
        ? baseName
        : await input({ message: "名称", default: baseName }));

    let category = opts.category;
    if (!category) {
      if (opts.yes) {
        category = categories[0]?.id ?? fail("manifest 里没有任何分类，先 categories add");
      } else {
        category = await select({
          message: "分类",
          choices: categories.map((c) => ({ name: `${c.emoji ?? ""}${c.name}`, value: c.id })),
        });
      }
    }
    if (!findCategory(manifest, category)) {
      fail(`分类不存在: ${category}`);
    }

    let tags: string[];
    if (opts.tags) {
      tags = opts.tags.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (opts.yes) {
      tags = [];
    } else {
      const existing = [...new Set(manifest.stickers.flatMap((s) => s.tags))].sort();
      const picked = existing.length
        ? await checkbox({
            message: "选择已有标签（可跳过）",
            choices: existing.map((t) => ({ name: t, value: t })),
          })
        : [];
      const extra = await input({
        message: "额外标签（逗号分隔）",
        default: "",
      });
      tags = [...picked, ...extra.split(",").map((s) => s.trim()).filter(Boolean)];
    }

    // R2 key 用 category/hash.ext 防重
    const key = `${category}/${info.hash}.${info.ext}`;
    let src: string;
    if (opts.dryRun) {
      src = publicUrlFor(key);
      log(c.dim(`  [dry-run] 将上传到 ${key}`));
    } else {
      const has = await exists(key).catch((e) => fail("R2 检查失败", e));
      if (has) {
        log(c.dim(`  ⏭  已存在，跳过上传: ${key}`));
        src = publicUrlFor(key);
      } else {
        log(c.dim(`  ⬆  上传 ${info.buffer.byteLength.toLocaleString()} bytes → ${key}`));
        src = await upload(key, info.buffer, info.ext).catch((e) => fail("R2 上传失败", e));
      }
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

    if (!opts.yes) {
      const ok = await confirm({
        message: `写入 manifest？\n${JSON.stringify(sticker, null, 2)}`,
        default: true,
      });
      if (!ok) {
        log(c.warn("  ⏭  跳过"));
        continue;
      }
    }

    manifest.stickers.push(sticker);
    log(c.ok(`  ✓ ${id} · ${name}`));
  }

  if (!opts.dryRun) {
    await writeManifest(manifest);
    log(c.ok(`\n✓ 已写入 manifest，共 ${manifest.stickers.length} 张`));
  } else {
    log(c.warn("\n[dry-run] 未写入 manifest"));
  }
}
