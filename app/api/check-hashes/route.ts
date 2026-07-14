import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { stickers } from "@/drizzle/schema";
import { requireUser } from "@/lib/auth-helpers";

/**
 * 批量检查 hash 是否已存在。
 * Body: { hashes: string[] }
 * Returns: { existing: { hash: string; status: 'approved'|'pending'|'rejected' }[] }
 */
export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json()) as { hashes?: unknown };
    if (!Array.isArray(body.hashes)) {
      return NextResponse.json({ ok: false, error: "hashes 必须是数组" }, { status: 400 });
    }
    const hashes = body.hashes.filter((h): h is string => typeof h === "string").slice(0, 200);
    if (hashes.length === 0) {
      return NextResponse.json(
        { ok: true, existing: [] },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const rows = await db
      .select({ hash: stickers.hash, status: stickers.status })
      .from(stickers)
      .where(inArray(stickers.hash, hashes));

    // 只关心 active（非 rejected）的，rejected 的允许重投
    const existing = rows.filter((r) => r.status !== "rejected");
    return NextResponse.json(
      { ok: true, existing },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
