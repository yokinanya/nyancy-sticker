"use client";

import Fuse from "fuse.js";
import type { Sticker } from "./types";

interface FilterOptions {
  query: string;
  categoryIds: ReadonlySet<string> | null;
  tags: readonly string[];
}

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
  opts: FilterOptions,
): Sticker[] {
  const query = opts.query.trim();
  const pool = query && fuse ? fuse.search(query).map((r) => r.item) : stickers;
  return pool.filter((sticker) => matchesFilters(sticker, opts));
}

function matchesFilters(sticker: Sticker, opts: FilterOptions) {
  if (opts.categoryIds && !opts.categoryIds.has(sticker.category)) return false;
  if (opts.tags.length === 0) return true;
  return opts.tags.every((tag) => sticker.tags.includes(tag));
}
