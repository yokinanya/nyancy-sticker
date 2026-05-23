import assert from "node:assert/strict";
import test from "node:test";
import { buildDuplicateGroups } from "../lib/similarity-groups";
import type { SimilarityRow } from "../lib/similarity-groups";

test("buildDuplicateGroups merges transitive similar stickers", () => {
  const groups = buildDuplicateGroups([
    row("a", "0000000000000000"),
    row("b", "0000000000000001"),
    row("c", "0000000000000003"),
    row("d", "ffffffffffffffff"),
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].stickers.map((sticker) => sticker.id).sort(),
    ["a", "b", "c"],
  );
});

test("buildDuplicateGroups returns no groups for distant stickers", () => {
  const groups = buildDuplicateGroups([
    row("a", "0000000000000000"),
    row("b", "ffffffffffffffff"),
  ]);
  assert.equal(groups.length, 0);
});

test("buildDuplicateGroups exposes invalid visual hashes", () => {
  assert.throws(
    () => buildDuplicateGroups([row("a", "0000000000000000"), row("b", "bad")]),
    /16 位十六进制/,
  );
});

test("buildDuplicateGroups skips confirmed variant pairs", () => {
  const groups = buildDuplicateGroups(
    [row("a", "0000000000000000"), row("b", "0000000000000001")],
    { ignoredPairs: new Set(["a\0b"]) },
  );
  assert.equal(groups.length, 0);
});

function row(id: string, visualHash: string): SimilarityRow {
  return {
    id,
    src: `https://example.test/${id}.png`,
    visualHash,
    name: id,
    previewSrc: `https://example.test/${id}.webp`,
    width: 32,
    height: 32,
    categoryId: "cat",
    tags: [],
    status: "approved",
    submitterLogin: "github-user",
    submittedAt: new Date("2026-01-01T00:00:00Z"),
  };
}
