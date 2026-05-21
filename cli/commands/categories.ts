import { input } from "@inquirer/prompts";
import { confirm } from "@inquirer/prompts";
import { readManifest, writeManifest, findCategory } from "../lib/manifest-io.js";
import { c, log, fail } from "../lib/log.js";

export async function categoriesAdd() {
  const m = await readManifest();
  const id = await input({ message: "分类 ID（英文）" });
  if (findCategory(m, id)) fail(`已存在: ${id}`);
  const name = await input({ message: "分类显示名" });
  const emoji = await input({ message: "emoji（可空）", default: "" });
  m.categories.push({ id, name, emoji: emoji || undefined });
  await writeManifest(m);
  log(c.ok(`✓ 新增分类 ${id}`));
}

export async function categoriesRm(id: string) {
  const m = await readManifest();
  if (!findCategory(m, id)) fail(`不存在: ${id}`);
  const used = m.stickers.filter((s) => s.category === id);
  if (used.length > 0) {
    const ok = await confirm({
      message: `有 ${used.length} 张表情包仍属于 ${id}，确定删除？（会成为悬空引用，请先迁移）`,
      default: false,
    });
    if (!ok) fail("已取消");
  }
  m.categories = m.categories.filter((c) => c.id !== id);
  await writeManifest(m);
  log(c.ok(`✓ 已删除分类 ${id}`));
}

export async function categoriesList() {
  const m = await readManifest();
  const counts: Record<string, number> = {};
  for (const s of m.stickers) counts[s.category] = (counts[s.category] ?? 0) + 1;
  log(c.bold(`共 ${m.categories.length} 个分类`));
  for (const cat of m.categories) {
    log(`  ${cat.emoji ?? "  "} ${cat.id.padEnd(12)} ${cat.name.padEnd(10)} · ${counts[cat.id] ?? 0}`);
  }
}
