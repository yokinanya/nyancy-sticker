import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { exists, publicUrlFor, upload } from "@/cli/lib/r2";
import type { Category, Manifest, Sticker, StickerExt } from "@/lib/types";

const EXT_MAP: Readonly<Record<string, StickerExt>> = {
  ".png": "png",
  ".gif": "gif",
  ".webp": "webp",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
};

export interface UploadOptions {
  category: string;
  tags: readonly string[];
}

export async function addUploadedFiles(
  manifest: Manifest,
  files: readonly File[],
  options: UploadOptions,
): Promise<Manifest> {
  const stickers = [...manifest.stickers];
  for (const file of files) {
    const info = await inspectUpload(file);
    const key = uploadKeyForCategory(manifest.categories, options.category, info.hash, info.ext);
    const src = (await exists(key)) ? publicUrlFor(key) : await upload(key, info.buffer, info.ext);
    stickers.push({
      id: uniqueStickerId({ ...manifest, stickers }, info.hash),
      name: path.basename(file.name, path.extname(file.name)),
      src,
      width: info.width,
      height: info.height,
      category: options.category,
      tags: [...options.tags],
      ext: info.ext,
      hash: info.hash,
    });
  }
  return { ...manifest, stickers };
}

function uniqueStickerId(manifest: Manifest, candidate: string): string {
  const ids = new Set(manifest.stickers.map((sticker) => sticker.id));
  if (!ids.has(candidate)) return candidate;
  let index = 2;
  while (ids.has(`${candidate}-${index}`)) index += 1;
  return `${candidate}-${index}`;
}

function uploadKeyForCategory(
  categories: readonly Category[],
  categoryId: string,
  hash: string,
  ext: StickerExt,
) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) throw new Error(`分类不存在：${categoryId}`);
  const parts = category.parentId
    ? ["stickers", category.parentId, category.id]
    : ["stickers", category.id];
  return `${parts.map(encodePathSegment).join("/")}/${hash}.${ext}`;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

async function inspectUpload(file: File) {
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

function extOf(fileName: string): StickerExt | null {
  const ext = path.extname(fileName).toLowerCase();
  return EXT_MAP[ext] ?? null;
}
