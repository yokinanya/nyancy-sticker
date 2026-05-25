import assert from "node:assert/strict";
import test from "node:test";
import { buildDuplicateGroups, findSimilarRows } from "../lib/similarity-groups";
import type { SimilarityRow } from "../lib/similarity-groups";

test("buildDuplicateGroups merges transitive similar stickers", () => {
  const groups = buildDuplicateGroups([
    row("a", fingerprint("0000000000000000")),
    row("b", fingerprint("0000000000000001")),
    row("c", fingerprint("0000000000000003")),
    row("d", fingerprint("ffffffffffffffff")),
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].stickers.map((sticker) => sticker.id).sort(),
    ["a", "b", "c"],
  );
});

test("buildDuplicateGroups returns no groups for distant stickers", () => {
  const groups = buildDuplicateGroups([
    row("a", fingerprint("0000000000000000")),
    row("b", fingerprint("ffffffffffffffff")),
  ]);
  assert.equal(groups.length, 0);
});

test("buildDuplicateGroups exposes invalid visual hashes", () => {
  assert.throws(
    () => buildDuplicateGroups([row("a", fingerprint("0000000000000000")), row("b", "bad")]),
    /48 位十六进制/,
  );
});

test("buildDuplicateGroups skips confirmed variant pairs", () => {
  const groups = buildDuplicateGroups(
    [row("a", fingerprint("0000000000000000")), row("b", fingerprint("0000000000000001"))],
    { ignoredPairs: new Set(["a\0b"]) },
  );
  assert.equal(groups.length, 0);
});

test("buildDuplicateGroups never merges stickers across characters", () => {
  const visualHashV2 = fingerprint("0000000000000000");
  const groups = buildDuplicateGroups([row("a", visualHashV2), row("b", visualHashV2, "other")]);
  assert.equal(groups.length, 0);
});

test("findSimilarRows only returns same-character matches", () => {
  const visualHashV2 = fingerprint("0000000000000000");
  const matches = findSimilarRows(
    { id: "source", characterId: "character", visualHashV2 },
    [row("same", visualHashV2), row("other", visualHashV2, "other")],
  );

  assert.deepEqual(matches.map((match) => match.id), ["same"]);
});

function fingerprint(hash: string): string {
  return `${hash}${hash}${hash}`;
}

function row(id: string, visualHashV2: string, characterId = "character"): SimilarityRow {
  return {
    id,
    src: `https://example.test/${id}.png`,
    characterId,
    visualHashV2,
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
