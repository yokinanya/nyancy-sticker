import assert from "node:assert/strict";
import test from "node:test";
import {
  filenameForBatchSticker,
  orderDownloadableStickers,
  validateBatchDownloadIds,
  type DownloadableSticker,
} from "../lib/batch-download";

test("filenameForBatchSticker keeps safe names and extensions", () => {
  assert.equal(
    filenameForBatchSticker(sticker({ id: "abc123", name: "miya_ok", ext: "gif" })),
    "miya_ok-abc123.gif",
  );
});

test("filenameForBatchSticker sanitizes unsafe names", () => {
  assert.equal(
    filenameForBatchSticker(sticker({ id: "id-1", name: "../坏 名?/贴纸", ext: "png" })),
    "坏_名_贴纸-id-1.png",
  );
});

test("filenameForBatchSticker falls back for empty names", () => {
  assert.equal(
    filenameForBatchSticker(sticker({ id: "empty", name: "?!..", ext: "webp" })),
    "sticker-empty.webp",
  );
});

test("validateBatchDownloadIds rejects invalid payloads", () => {
  assert.throws(() => validateBatchDownloadIds({ ids: [] }), /不能为空/);
  assert.throws(() => validateBatchDownloadIds({ ids: ["ok", ""] }), /非空字符串数组/);
  assert.throws(() => validateBatchDownloadIds({ ids: "ok" }), /字符串数组/);
});

test("validateBatchDownloadIds deduplicates while preserving first occurrence", () => {
  assert.deepEqual(validateBatchDownloadIds({ ids: ["a", "b", "a"] }), ["a", "b"]);
});

test("orderDownloadableStickers keeps requested order and skips missing rows", () => {
  const ordered = orderDownloadableStickers(
    ["b", "missing", "a"],
    [sticker({ id: "a" }), sticker({ id: "b" })],
  );
  assert.deepEqual(ordered.map((item) => item.id), ["b", "a"]);
});

function sticker(overrides: Partial<DownloadableSticker>): DownloadableSticker {
  return {
    id: "id",
    name: "name",
    src: "https://example.test/sticker.png",
    ext: "png",
    ...overrides,
  };
}
