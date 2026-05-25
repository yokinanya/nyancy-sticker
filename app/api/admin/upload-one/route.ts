import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, stickers } from "@/drizzle/schema";
import { requireEditor } from "@/lib/auth-helpers";
import { assertActiveVisualHashesComplete } from "@/lib/queries/similar-stickers";
import { uploadStickerFile } from "@/lib/upload";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  try {
    const session = await requireEditor();
    const formData = await request.formData();

    const category = readText(formData, "category");
    const name = readText(formData, "name");
    const tagsValue = formData.get("tags");
    const tags = typeof tagsValue === "string" && tagsValue.trim() ? splitTags(tagsValue) : [];

    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("缺少图片文件。");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("仅支持 PNG / JPG / GIF / WebP。");
    if (file.size === 0) throw new Error("文件内容为空。");
    if (file.size > MAX_SIZE_BYTES) throw new Error("文件过大（>8MB）。");

    const found = await db.query.categories.findFirst({ where: eq(categories.id, category) });
    if (!found) throw new Error(`分类不存在：${category}`);

    await assertActiveVisualHashesComplete();
    const uploaded = await uploadStickerFile(file, category);

    try {
      await db.insert(stickers).values({
        id: uploaded.hash,
        name,
        src: uploaded.src,
        previewSrc: uploaded.previewSrc,
        width: uploaded.width,
        height: uploaded.height,
        ext: uploaded.ext,
        hash: uploaded.hash,
        visualHash: uploaded.visualHash,
        visualHashV2: uploaded.visualHashV2,
        categoryId: category,
        tags,
        status: "approved",
        submittedById: session.user.id,
        approvedById: session.user.id,
        approvedAt: new Date(),
      });
    } catch (err) {
      if (err instanceof Error && /sticker_hash_active_idx|duplicate key/i.test(err.message)) {
        return NextResponse.json(
          { ok: false, error: "这张图已经存在或在审核队列里。" },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true, id: uploaded.hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

function splitTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}
