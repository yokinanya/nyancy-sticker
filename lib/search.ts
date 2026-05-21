"use client";

import Fuse from "fuse.js";
import { categoryMatches } from "@/lib/categories";
import type { Category, Sticker } from "./types";

export function createFuse(stickers: Sticker[]) {
  return new Fuse(stickers, {
    keys: [
      { name: "name", weight: 0.6 },
      { name: "tags", weight: 0.3 },
      { name: "category", weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
}

export function filterStickers(
  stickers: Sticker[],
  fuse: Fuse<Sticker> | null,
  opts: { query: string; category: string | null; tags: string[]; categories: Category[] },
): Sticker[] {
  let pool = stickers;
  if (opts.category) {
    pool = pool.filter((s) => categoryMatches(opts.categories, s.category, opts.category!));
  }
  if (opts.tags.length > 0)
    pool = pool.filter((s) => opts.tags.every((t) => s.tags.includes(t)));
  if (!opts.query.trim() || !fuse) return pool;
  // Fuse 在过滤后的子集上重新搜索：构建子集索引
  const sub = new Fuse(pool, {
    keys: ["name", "tags", "category"],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
  return sub.search(opts.query.trim()).map((r) => r.item);
}
