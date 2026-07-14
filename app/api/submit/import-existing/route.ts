import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePendingStickerData } from "@/lib/route-cache-revalidation";
import { insertPendingSticker, isDuplicateStickerError } from "@/lib/sticker-record";
import { importExistingStickerObject } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const input = await readImportInput(request);
    const uploaded = await importExistingStickerObject(input.hash, input.fileName, input.category);
    if (!uploaded) return NextResponse.json({ ok: true, imported: false });

    try {
      await insertPendingSticker({ ...input, uploaded, userId: session.user.id });
    } catch (err) {
      if (isDuplicateStickerError(err)) {
        return NextResponse.json(
          { ok: false, error: "这张图已经存在或已在审核队列里。" },
          { status: 409 },
        );
      }
      throw err;
    }

    revalidatePendingStickerData();
    return NextResponse.json({ ok: true, imported: true, id: uploaded.hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入已有图片失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

async function readImportInput(request: Request) {
  const body = (await request.json()) as Partial<Record<string, unknown>>;
  return {
    category: readText(body.category, "category"),
    fileName: readText(body.fileName, "fileName"),
    hash: readHash(body.hash),
    name: readText(body.name, "name"),
    tags: typeof body.tags === "string" ? body.tags : "",
  };
}

function readHash(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{16}$/i.test(value)) {
    throw new Error("hash 必须是 16 位十六进制字符串。");
  }
  return value.toLowerCase();
}

function readText(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}
