import assert from "node:assert/strict";
import test from "node:test";
import {
  allCategoryCount,
  categoryMatches,
  defaultGalleryCategoryId,
} from "../lib/categories";
import type { Category } from "../lib/types";

const categories: readonly Category[] = [
  { id: "miya_daily", name: "日常", slug: "daily", sortOrder: 0, characterId: "miya" },
  { id: "miya_emote", name: "动态", slug: "emote", sortOrder: 10, characterId: "miya" },
];

test("allCategoryCount sums all category counts", () => {
  assert.equal(allCategoryCount({ miya_daily: 2, miya_emote: 3 }), 5);
});

test("null category matches all stickers", () => {
  assert.equal(categoryMatches(categories, null, "miya_daily"), true);
  assert.equal(categoryMatches(categories, null, "miya_emote"), true);
});

test("defaultGalleryCategoryId uses null when all tab is enabled", () => {
  assert.equal(defaultGalleryCategoryId(categories, true), null);
  assert.equal(defaultGalleryCategoryId(categories, false), "miya_daily");
});
