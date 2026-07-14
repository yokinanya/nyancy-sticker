import {
  baseName,
  extOfName,
  isImageFile,
  MAX_SIZE_BYTES,
} from "@/lib/image-shared";
import type {
  PatchUploadItem,
  UploadItem,
} from "./types";

const HASH_HEX_LENGTH = 16;

export interface ProcessingResult {
  readonly added: number;
  readonly failed: number;
}

interface PreparedItem {
  readonly item: UploadItem;
  readonly hash: string;
}

export function createUploadItems(files: readonly File[]): UploadItem[] {
  return files.filter(isImageFile).map((file) => ({
    clientId: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    ext: extOfName(file.name),
    name: baseName(file.name),
    tags: "",
    status: file.size > MAX_SIZE_BYTES ? "invalid" : "processing",
    progress: 0,
    errorMsg: file.size > MAX_SIZE_BYTES ? ">8MB 已忽略" : undefined,
  }));
}

export async function processUploadItems(
  items: readonly UploadItem[],
  onPatch: PatchUploadItem,
): Promise<ProcessingResult> {
  const processable = items.filter((item) => item.status === "processing");
  const settled = await Promise.allSettled(
    processable.map((item) => processItem(item, onPatch)),
  );
  const prepared = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  await markDuplicates(prepared, onPatch);
  return {
    added: items.length,
    failed: items.length - prepared.length,
  };
}

async function processItem(
  item: UploadItem,
  onPatch: PatchUploadItem,
): Promise<PreparedItem> {
  try {
    const [hash, dimensions] = await Promise.all([
      computeHash(item.file),
      decodeDimensions(item.previewUrl),
    ]);
    onPatch(item.clientId, {
      hash,
      width: dimensions.width,
      height: dimensions.height,
      status: "ready",
    });
    return { item, hash };
  } catch (cause) {
    onPatch(item.clientId, {
      status: "invalid",
      errorMsg: errorMessage(cause, "解析失败"),
    });
    throw cause;
  }
}

async function markDuplicates(
  prepared: readonly PreparedItem[],
  onPatch: PatchUploadItem,
): Promise<void> {
  if (prepared.length === 0) return;
  try {
    const existing = await checkHashes(prepared.map((item) => item.hash));
    for (const { item, hash } of prepared) {
      if (!existing.has(hash)) continue;
      onPatch(item.clientId, {
        status: "duplicate",
        errorMsg: "已存在或在审核队列里",
      });
    }
  } catch (cause) {
    const message = errorMessage(cause, "重复检测失败");
    prepared.forEach(({ item }) => {
      onPatch(item.clientId, { status: "invalid", errorMsg: message });
    });
    throw cause;
  }
}

async function checkHashes(hashes: readonly string[]): Promise<ReadonlySet<string>> {
  const response = await fetch("/api/check-hashes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hashes }),
  });
  const data: unknown = await response.json();
  if (!response.ok || !isRecord(data) || data.ok !== true || !Array.isArray(data.existing)) {
    throw new Error(readError(data, response.status));
  }
  const values = data.existing.map((entry) => {
    if (!isRecord(entry) || typeof entry.hash !== "string") {
      throw new Error("重复检测响应格式无效。");
    }
    return entry.hash;
  });
  return new Set(values);
}

async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, HASH_HEX_LENGTH);
}

function decodeDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("无法解码图片"));
    image.src = url;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readError(value: unknown, status: number): string {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : `重复检测失败：HTTP ${status}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
