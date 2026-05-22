import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { exists, publicUrlFor, upload } from "@/lib/r2";
import { inspectImage } from "@/lib/image";
import { stickerKey } from "@/lib/keys";
import type { StickerExt } from "@/lib/types";

export interface UploadedSticker {
  src: string;
  key: string;
  hash: string;
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
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!category) throw new Error(`分类不存在：${categoryId}`);

  const info = await inspectImage(file);
  const key = stickerKey({ id: category.id, parentId: category.parentId }, info.hash, info.ext);
  const src = (await exists(key)) ? publicUrlFor(key) : await upload(key, info.buffer, info.ext);

  const baseName = file.name.replace(/\.[^./\\]+$/, "");
  return {
    src,
    key,
    hash: info.hash,
    width: info.width,
    height: info.height,
    ext: info.ext,
    baseName,
  };
}
