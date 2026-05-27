import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { requireUser } from "@/lib/auth-helpers";
import { presignedPutObjectUrl } from "@/lib/r2";
import { extOfName, MAX_SIZE_BYTES, type StickerExt } from "@/lib/image-shared";

export const runtime = "nodejs";

const CACHE_CONTROL = "no-store";
const PRESIGN_EXPIRES_SECONDS = 300;
const CONTENT_TYPES: Record<StickerExt, string> = {
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const input = await readPresignInput(request);
    await assertCategory(input.category);
    const ext = assertSupportedFile(input.fileName, input.contentType);
    if (input.size === 0) throw new Error("文件内容为空。");
    if (input.size > MAX_SIZE_BYTES) throw new Error("文件过大（>8MB）。");

    const key = `tmp/uploads/${encodeURIComponent(session.user.id)}/${randomUUID()}.${ext}`;
    const uploadUrl = await presignedPutObjectUrl({
      key,
      contentType: input.contentType,
      cacheControl: CACHE_CONTROL,
      expiresInSeconds: PRESIGN_EXPIRES_SECONDS,
    });
    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      headers: { "Content-Type": input.contentType, "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建上传地址失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

async function readPresignInput(request: Request) {
  const body = (await request.json()) as Partial<{
    category: unknown;
    contentType: unknown;
    fileName: unknown;
    size: unknown;
  }>;
  return {
    category: readText(body.category, "category"),
    contentType: readText(body.contentType, "contentType"),
    fileName: readText(body.fileName, "fileName"),
    size: readNumber(body.size, "size"),
  };
}

function assertSupportedFile(fileName: string, contentType: string): StickerExt {
  const ext = extOfName(fileName);
  if (!ext || CONTENT_TYPES[ext] !== contentType) {
    throw new Error("仅支持 PNG / JPG / GIF / WebP。");
  }
  return ext;
}

async function assertCategory(category: string): Promise<void> {
  const found = await db.query.categories.findFirst({ where: eq(categories.id, category) });
  if (!found) throw new Error(`分类不存在：${category}`);
}

function readText(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

function readNumber(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`缺少字段：${key}`);
  }
  return value;
}
