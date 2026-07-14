import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth-helpers";
import { revalidatePublishedStickerData } from "@/lib/route-cache-revalidation";
import { insertApprovedSticker, isDuplicateStickerError } from "@/lib/sticker-record";
import { uploadStickerFile } from "@/lib/upload";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  try {
    const session = await requireEditor();
    const formData = await request.formData();

    const category = readText(formData, "category");
    const name = readText(formData, "name");
    const tagsValue = formData.get("tags");
    const tags = typeof tagsValue === "string" ? tagsValue : "";

    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("缺少图片文件。");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("仅支持 PNG / JPG / GIF / WebP。");
    if (file.size === 0) throw new Error("文件内容为空。");
    if (file.size > MAX_SIZE_BYTES) throw new Error("文件过大（>8MB）。");

    const uploaded = await uploadStickerFile(file, category);

    try {
      await insertApprovedSticker({ category, name, tags, uploaded, userId: session.user.id });
    } catch (err) {
      if (isDuplicateStickerError(err)) {
        return NextResponse.json(
          { ok: false, error: "这张图已经存在或在审核队列里。" },
          { status: 409 },
        );
      }
      throw err;
    }

    revalidatePublishedStickerData([uploaded.characterId]);
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
