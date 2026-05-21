import { input } from "@inquirer/prompts";
import { confirm } from "@inquirer/prompts";
import { select } from "@inquirer/prompts";
import { readManifest, writeManifest, findCategory } from "../lib/manifest-io.js";
import { c, log, fail } from "../lib/log.js";

export async function categoriesAdd() {
  const m = await readManifest();
  const rawId = await input({ message: "分类 ID（英文；二级分类可只填短 id）" });
  const name = await input({ message: "分类显示名" });
  const parentId = await select({
    message: "父分类",
    choices: [
      { name: "一级分类", value: "" },
      ...m.categories
        .filter((category) => !category.parentId)
        .map((category) => ({ name: category.name, value: category.id })),
    ],
  });
  const id = buildCategoryId(rawId, parentId || undefined);
  if (findCategory(m, id)) fail(`已存在: ${id}`);
  m.categories.push({ id, name, parentId: parentId || undefined });
  await writeManifest(m);
  log(c.ok(`✓ 新增分类 ${id}`));
}

function buildCategoryId(rawId: string, parentId: string | undefined) {
  if (!parentId) return rawId;
  const prefix = `${parentId}_`;
  return rawId.startsWith(prefix) ? rawId : `${prefix}${rawId}`;
}

export async function categoriesRm(id: string) {
  const m = await readManifest();
  if (!findCategory(m, id)) fail(`不存在: ${id}`);
  const used = m.stickers.filter((s) => s.category === id);
  const children = m.categories.filter((c) => c.parentId === id);
  if (children.length > 0) fail(`分类 ${id} 还有 ${children.length} 个二级分类，先删除或迁移它们`);
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
    const prefix = cat.parentId ? `  └ ${cat.id.padEnd(10)}` : cat.id.padEnd(12);
    log(`  ${prefix} ${cat.name.padEnd(10)} · ${counts[cat.id] ?? 0}`);
  }
}
