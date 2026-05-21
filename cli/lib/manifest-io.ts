import { promises as fs } from "node:fs";
import path from "node:path";
import type { Manifest, Sticker, Category } from "../../lib/types.js";

const MANIFEST_PATH = path.resolve(process.cwd(), "data/stickers.json");

export async function readManifest(): Promise<Manifest> {
  const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as Manifest;
}

export async function writeManifest(m: Manifest): Promise<void> {
  // 排序使 diff 友好
  m.categories.sort((a, b) => a.id.localeCompare(b.id));
  m.stickers.sort((a, b) => a.id.localeCompare(b.id));
  const json = JSON.stringify(m, null, 2) + "\n";
  // 原子写：先写临时文件再重命名
  const tmp = MANIFEST_PATH + ".tmp";
  await fs.writeFile(tmp, json, "utf-8");
  await fs.rename(tmp, MANIFEST_PATH);
}

export function findSticker(m: Manifest, id: string): Sticker | undefined {
  return m.stickers.find((s) => s.id === id);
}

export function findCategory(m: Manifest, id: string): Category | undefined {
  return m.categories.find((c) => c.id === id);
}

export function uniqueId(m: Manifest, candidate: string): string {
  if (!findSticker(m, candidate)) return candidate;
  let i = 2;
  while (findSticker(m, `${candidate}-${i}`)) i++;
  return `${candidate}-${i}`;
}
