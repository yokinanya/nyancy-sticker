import { NextResponse } from "next/server";
import { addUploadedFiles } from "@/lib/admin-upload";
import { assertLocalAdmin, readManifestFile, writeManifestFile } from "@/lib/manifest-file";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertLocalAdmin();
    const formData = await request.formData();
    const manifest = await readManifestFile();
    const category = readText(formData, "uploadCategory");
    if (!manifest.categories.some((item) => item.id === category)) {
      throw new Error(`分类不存在：${category}`);
    }
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    if (files.length === 0) throw new Error("请选择至少一个图片文件。");
    const tags = readTags(formData);
    const nextManifest = await addUploadedFiles(manifest, files, { category, tags });
    await writeManifestFile(nextManifest);
    return NextResponse.json({ ok: true, count: files.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "上传失败。" },
      { status: 400 },
    );
  }
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}

function readTags(formData: FormData) {
  const value = formData.get("uploadTags");
  if (typeof value !== "string" || value.trim().length === 0) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}
