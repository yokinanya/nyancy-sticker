import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { stickers } from "@/drizzle/schema";
import {
  fetchStickerDownloadFile,
  orderDownloadableStickers,
  validateBatchDownloadIds,
  type StickerDownloadFile,
} from "@/lib/batch-download";
import { db } from "@/lib/db";

const ALLOWED_HOST = process.env.R2_PUBLIC_HOST;
const require = createRequire(import.meta.url);
const { ZipArchive } = require("archiver") as ArchiverModule;

interface ArchiveStream {
  append: (body: Buffer, options: { name: string }) => void;
  finalize: () => void;
  pipe: (stream: PassThrough) => void;
}

interface ArchiverModule {
  ZipArchive: new (options: { store: boolean }) => ArchiveStream;
}

export async function POST(request: Request) {
  if (!ALLOWED_HOST) {
    return NextResponse.json({ error: "R2_PUBLIC_HOST 未配置" }, { status: 500 });
  }

  const ids = await readRequestIds(request);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: 400 });

  const selected = await listApprovedDownloadStickers(ids.value);
  if (selected.length === 0) {
    return NextResponse.json({ error: "没有可下载的已审核贴纸" }, { status: 404 });
  }

  const files = await Promise.all(
    selected.map((sticker) => fetchStickerDownloadFile(sticker, ALLOWED_HOST)),
  );
  return zipResponse(files);
}

async function readRequestIds(
  request: Request,
): Promise<{ ok: true; value: string[] } | { ok: false; error: string }> {
  try {
    return { ok: true, value: validateBatchDownloadIds(await request.json()) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function listApprovedDownloadStickers(ids: readonly string[]) {
  const rows = await db
    .select({
      id: stickers.id,
      name: stickers.name,
      src: stickers.src,
      ext: stickers.ext,
    })
    .from(stickers)
    .where(and(eq(stickers.status, "approved"), inArray(stickers.id, [...ids])));

  return orderDownloadableStickers(ids, rows);
}

function zipResponse(files: readonly StickerDownloadFile[]) {
  const archive = new ZipArchive({ store: true });
  const stream = new PassThrough();
  archive.pipe(stream);
  for (const file of files) archive.append(file.body, { name: file.filename });
  archive.finalize();

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename()}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function zipFilename() {
  return `nyancy-stickers-${new Date().toISOString().slice(0, 10)}.zip`;
}
