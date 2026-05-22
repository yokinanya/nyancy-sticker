import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { StickerExt } from "@/lib/types";

const EXT_MAP: Readonly<Record<string, StickerExt>> = {
  ".png": "png",
  ".gif": "gif",
  ".webp": "webp",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
};

export interface InspectedImage {
  width: number;
  height: number;
  ext: StickerExt;
  hash: string;
  buffer: Buffer;
}

export async function inspectImage(file: File): Promise<InspectedImage> {
  const ext = extOf(file.name);
  if (!ext) throw new Error(`不支持的图片格式：${file.name}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buffer, { animated: ext === "gif" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;
  if (!width || !height) throw new Error(`无法读取图片尺寸：${file.name}`);
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  return { width, height, ext, hash, buffer };
}

export function extOf(fileName: string): StickerExt | null {
  const ext = path.extname(fileName).toLowerCase();
  return EXT_MAP[ext] ?? null;
}

export function baseName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName));
}
