import type { StickerExt } from "@/lib/types";

const SAFE_NAME_PATTERN = /[^a-zA-Z0-9\u4e00-\u9fa5._-]+/g;
const EDGE_DOTS_PATTERN = /^[.\s_-]+|[.\s_-]+$/g;

export interface DownloadableSticker {
  id: string;
  name: string;
  src: string;
  ext: StickerExt;
}

export interface StickerDownloadFile {
  filename: string;
  body: Buffer;
}

export function validateBatchDownloadIds(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.ids)) {
    throw new Error("ids 必须是字符串数组");
  }
  const ids = payload.ids.map(assertStickerId);
  if (ids.length === 0) throw new Error("ids 不能为空");
  return Array.from(new Set(ids));
}

export function orderDownloadableStickers(
  ids: readonly string[],
  stickers: readonly DownloadableSticker[],
): DownloadableSticker[] {
  const byId = new Map(stickers.map((sticker) => [sticker.id, sticker]));
  return ids.flatMap((id) => {
    const sticker = byId.get(id);
    return sticker ? [sticker] : [];
  });
}

export function filenameForBatchSticker(sticker: Pick<DownloadableSticker, "id" | "name" | "ext">) {
  const base = sanitizeFilenamePart(sticker.name) || "sticker";
  return `${base}-${sticker.id}.${sticker.ext}`;
}

export async function fetchStickerDownloadFile(
  sticker: DownloadableSticker,
  allowedHost: string,
): Promise<StickerDownloadFile> {
  const url = parseAllowedStickerUrl(sticker.src, allowedHost);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`贴纸下载失败：${sticker.id} upstream ${response.status}`);
  return {
    filename: filenameForBatchSticker(sticker),
    body: Buffer.from(await response.arrayBuffer()),
  };
}

function assertStickerId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("ids 必须是非空字符串数组");
  }
  return value;
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(SAFE_NAME_PATTERN, "_").replace(EDGE_DOTS_PATTERN, "").slice(0, 80);
}

function parseAllowedStickerUrl(src: string, allowedHost: string): string {
  const url = new URL(src);
  if (url.hostname !== allowedHost) throw new Error(`贴纸来源不允许：${url.hostname}`);
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
