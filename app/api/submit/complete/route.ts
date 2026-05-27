import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { assertActiveVisualHashesComplete } from "@/lib/queries/similar-stickers";
import { revalidateStickerViews } from "@/lib/revalidate-stickers";
import { insertPendingSticker, isDuplicateStickerError } from "@/lib/sticker-record";
import { uploadStickerObject } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const input = await readCompleteInput(request);
    assertOwnedTempKey(input.key, session.user.id);

    await assertActiveVisualHashesComplete();
    const uploaded = await uploadStickerObject(input.key, input.fileName, input.category);

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

    revalidateStickerViews();
    return NextResponse.json({ ok: true, id: uploaded.hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "投稿失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

async function readCompleteInput(request: Request) {
  const body = (await request.json()) as Partial<Record<string, unknown>>;
  return {
    category: readText(body.category, "category"),
    fileName: readText(body.fileName, "fileName"),
    key: readText(body.key, "key"),
    name: readText(body.name, "name"),
    tags: typeof body.tags === "string" ? body.tags : "",
  };
}

function assertOwnedTempKey(key: string, userId: string): void {
  const prefix = `tmp/uploads/${encodeURIComponent(userId)}/`;
  if (!key.startsWith(prefix)) throw new Error("上传对象不属于当前用户。");
}

function readText(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}
