import assert from "node:assert/strict";
import test from "node:test";
import { orderGalleryStickers } from "../lib/sticker-order";
import type { Sticker } from "../lib/types";

test("orderGalleryStickers sorts default view by id", () => {
  const ordered = orderGalleryStickers([
    sticker({ id: "b", submittedAt: "2026-01-01T00:00:00.000Z" }),
    sticker({ id: "a", submittedAt: "2026-02-01T00:00:00.000Z" }),
  ], null, "default");

  assert.deepEqual(ordered.map((item) => item.id), ["a", "b"]);
});

test("orderGalleryStickers sorts default category view by id", () => {
  const ordered = orderGalleryStickers([
    sticker({ id: "b", submittedAt: "2026-01-01T00:00:00.000Z" }),
    sticker({ id: "a", submittedAt: "2026-02-01T00:00:00.000Z" }),
  ], "miya_daily", "default");

  assert.deepEqual(ordered.map((item) => item.id), ["a", "b"]);
});

test("orderGalleryStickers can sort by oldest upload first", () => {
  const ordered = orderGalleryStickers([
    sticker({ id: "new", submittedAt: "2026-02-01T00:00:00.000Z" }),
    sticker({ id: "old", submittedAt: "2026-01-01T00:00:00.000Z" }),
  ], null, "oldest");

  assert.deepEqual(ordered.map((item) => item.id), ["old", "new"]);
});

test("orderGalleryStickers can sort by name", () => {
  const ordered = orderGalleryStickers([
    sticker({ id: "b", name: "睡觉" }),
    sticker({ id: "a", name: "吃饭" }),
  ], null, "name");

  assert.deepEqual(ordered.map((item) => item.id), ["a", "b"]);
});

function sticker(overrides: Partial<Sticker>): Sticker {
  return {
    id: "id",
    name: "name",
    src: "/sticker.webp",
    previewSrc: "/preview.webp",
    width: 128,
    height: 128,
    category: "miya_daily",
    tags: [],
    ext: "webp",
    submittedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
