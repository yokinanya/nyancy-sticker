import { readManifest, findSticker, writeManifest } from "../lib/manifest-io.js";
import { input, checkbox, select } from "@inquirer/prompts";
import { c, log, fail } from "../lib/log.js";

export async function editCommand(id: string) {
  const m = await readManifest();
  const s = findSticker(m, id);
  if (!s) fail(`未找到 id=${id}`);

  s.name = await input({ message: "名称", default: s.name });
  s.category = await select({
    message: "分类",
    choices: m.categories.map((c) => ({
      name: c.name,
      value: c.id,
    })),
    default: s.category,
  });

  const allTags = [...new Set(m.stickers.flatMap((x) => x.tags))].sort();
  const picked = await checkbox({
    message: "勾选标签",
    choices: allTags.map((t) => ({
      name: t,
      value: t,
      checked: s.tags.includes(t),
    })),
  });
  const extra = await input({
    message: "额外新增标签（逗号分隔）",
    default: "",
  });
  s.tags = [
    ...new Set([
      ...picked,
      ...extra.split(",").map((x) => x.trim()).filter(Boolean),
    ]),
  ];

  await writeManifest(m);
  log(c.ok(`✓ 已更新 ${s.id}`));
}
