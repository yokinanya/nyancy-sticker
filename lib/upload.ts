import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { download, exists, publicUrlFor, remove, upload } from "@/lib/r2";
import { inspectImageBuffer } from "@/lib/image";
import { previewKey, stickerKey } from "@/lib/keys";
import { generateStickerPreview, previewExtFor } from "@/lib/preview";
import { MAX_SIZE_BYTES } from "@/lib/image-shared";
import type { StickerExt } from "@/lib/types";

export interface UploadedSticker {
  src: string;
  previewSrc: string;
  key: string;
  previewKey: string;
  hash: string;
  visualHash: string;
  visualHashV2: string;
  width: number;
  height: number;
  ext: StickerExt;
  baseName: string;
}

/**
 * 上传单张贴纸到 R2，hash 已存在则复用同一对象不重传。
 * 仅负责文件层，不写 DB；由 caller 决定 insert 哪种 status。
 */
export async function uploadStickerFile(file: File, categoryId: string): Promise<UploadedSticker> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadStickerBuffer(buffer, file.name, categoryId);
}

export async function uploadStickerObject(
  key: string,
  fileName: string,
  categoryId: string,
): Promise<UploadedSticker> {
  try {
    const object = await download(key);
    if (object.buffer.length === 0) throw new Error("文件内容为空。");
    if (object.buffer.length > MAX_SIZE_BYTES) throw new Error("文件过大（>8MB）。");
    return await uploadStickerBuffer(object.buffer, fileName, categoryId);
  } finally {
    await remove(key);
  }
}

export async function importExistingStickerObject(
  hash: string,
  fileName: string,
  categoryId: string,
): Promise<UploadedSticker | null> {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!category) throw new Error(`分类不存在：${categoryId}`);
  const ext = extFromFileName(fileName);
  const ref = { characterId: category.characterId, slug: category.slug };
  const key = stickerKey(ref, hash, ext);
  if (!(await exists(key))) return null;
  const object = await download(key);
  if (object.buffer.length === 0) throw new Error("文件内容为空。");
  if (object.buffer.length > MAX_SIZE_BYTES) throw new Error("文件过大（>8MB）。");
  return uploadStickerBuffer(object.buffer, fileName, categoryId);
}

async function uploadStickerBuffer(
  buffer: Buffer,
  fileName: string,
  categoryId: string,
): Promise<UploadedSticker> {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!category) throw new Error(`分类不存在：${categoryId}`);

  const info = await inspectImageBuffer(buffer, fileName);
  const ref = { characterId: category.characterId, slug: category.slug };
  const key = stickerKey(ref, info.hash, info.ext);
  const preview = previewKey(ref, info.hash, previewExtFor(info.ext));
  const [src, previewSrc] = await Promise.all([
    uploadIfMissing(key, info.buffer, info.ext),
    uploadPreviewIfMissing(preview, info.buffer, info.ext),
  ]);

  const baseName = fileName.replace(/\.[^./\\]+$/, "");
  return {
    src,
    previewSrc,
    key,
    previewKey: preview,
    hash: info.hash,
    visualHash: info.visualHash,
    visualHashV2: info.visualHashV2,
    width: info.width,
    height: info.height,
    ext: info.ext,
    baseName,
  };
}

async function uploadIfMissing(key: string, buffer: Buffer, ext: StickerExt) {
  if (await exists(key)) return publicUrlFor(key);
  return upload(key, buffer, ext);
}

async function uploadPreviewIfMissing(key: string, buffer: Buffer, ext: StickerExt) {
  if (await exists(key)) return publicUrlFor(key);
  const preview = await generateStickerPreview(buffer, ext);
  return upload(key, preview.buffer, preview.ext);
}

function extFromFileName(fileName: string): StickerExt {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "png" || ext === "gif" || ext === "webp" || ext === "jpg" || ext === "jpeg") return ext;
  throw new Error(`不支持的图片格式：${fileName}`);
}
