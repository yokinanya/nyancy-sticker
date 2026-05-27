import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { StickerExt } from "@/lib/types";
import { generateVisualHash, generateVisualHashV2 } from "@/lib/visual-hash";

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
  visualHash: string;
  visualHashV2: string;
  buffer: Buffer;
}

export async function inspectImage(file: File): Promise<InspectedImage> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return inspectImageBuffer(buffer, file.name);
}

export async function inspectImageBuffer(buffer: Buffer, fileName: string): Promise<InspectedImage> {
  const ext = extOf(fileName);
  if (!ext) throw new Error(`不支持的图片格式：${fileName}`);
  const [meta, visualHash, visualHashV2] = await Promise.all([
    sharp(buffer, { animated: ext === "gif" }).metadata(),
    generateVisualHash(buffer),
    generateVisualHashV2(buffer),
  ]);
  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;
  if (!width || !height) throw new Error(`无法读取图片尺寸：${fileName}`);
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  return { width, height, ext, hash, visualHash, visualHashV2, buffer };
}

export function extOf(fileName: string): StickerExt | null {
  const ext = path.extname(fileName).toLowerCase();
  return EXT_MAP[ext] ?? null;
}

export function baseName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName));
}
