import assert from "node:assert/strict";
import test from "node:test";
import { uploadQueue, UPLOAD_CONCURRENCY } from "../components/batch-upload/transport";
import type { UploadItem, UploadItemPatch } from "../components/batch-upload/types";

const ITEM_COUNT = 100;

test("uploadQueue processes 100 items with concurrency three", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  let activeRequests = 0;
  let maximumRequests = 0;
  const patches = new Map<string, UploadItemPatch[]>();
  globalThis.fetch = async () => {
    activeRequests += 1;
    maximumRequests = Math.max(maximumRequests, activeRequests);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    activeRequests -= 1;
    return jsonResponse({ ok: true, imported: true });
  };

  await uploadQueue({
    items: Array.from({ length: ITEM_COUNT }, (_, index) => uploadItem(index)),
    endpoint: "/api/submit",
    category: "miya:default",
    mode: "direct",
    onItemPatch: (id, patch) => patches.set(id, [...(patches.get(id) ?? []), patch]),
  });

  assert.equal(maximumRequests, UPLOAD_CONCURRENCY);
  assert.equal(patches.size, ITEM_COUNT);
  patches.forEach((updates) => {
    assert.deepEqual(updates.map((update) => update.status), ["uploading", "done"]);
  });
});

test("uploadQueue exposes row errors and rejects the batch", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const rowUpdates: UploadItemPatch[] = [];
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { fileName: string };
    return body.fileName === "bad.png"
      ? jsonResponse({ ok: false, error: "测试上传失败" }, 500)
      : jsonResponse({ ok: true, imported: true });
  };

  await assert.rejects(
    uploadQueue({
      items: [uploadItem(0, "bad.png")],
      endpoint: "/api/submit",
      category: "miya:default",
      mode: "direct",
      onItemPatch: (_id, patch) => rowUpdates.push(patch),
    }),
    (error) => error instanceof AggregateError && /1 张图片上传失败/.test(error.message),
  );
  assert.equal(rowUpdates.at(-1)?.status, "error");
  assert.equal(rowUpdates.at(-1)?.errorMsg, "测试上传失败");
});

function uploadItem(index: number, fileName = `sticker-${index}.png`): UploadItem {
  return {
    clientId: `item-${index}`,
    file: { name: fileName } as File,
    previewUrl: `blob:item-${index}`,
    ext: "png",
    hash: `hash-${index}`,
    name: `sticker-${index}`,
    tags: "",
    status: "ready",
    progress: 0,
  };
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
