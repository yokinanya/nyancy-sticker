import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { StickerExt } from "../../lib/types.js";

const EXT_MAP: Record<string, StickerExt> = {
  ".png": "png",
  ".gif": "gif",
  ".webp": "webp",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
};

export function extOf(filePath: string): StickerExt | null {
  const e = path.extname(filePath).toLowerCase();
  return EXT_MAP[e] ?? null;
}

export interface ImageInfo {
  width: number;
  height: number;
  ext: StickerExt;
  hash: string; // sha256[0..16]
  buffer: Buffer;
}

export async function inspectImage(filePath: string): Promise<ImageInfo> {
  const ext = extOf(filePath);
  if (!ext) throw new Error(`不支持的图片格式: ${filePath}`);
  const buffer = await fs.readFile(filePath);
  const meta = await sharp(buffer, { animated: ext === "gif" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;
  if (!width || !height) throw new Error(`无法读取图片尺寸: ${filePath}`);
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  return { width, height, ext, hash, buffer };
}
