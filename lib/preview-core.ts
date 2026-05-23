import sharp from "sharp";
import type { StickerExt } from "@/lib/types";

const WEBP_PREVIEW_SIZE = 240;
const WEBP_PREVIEW_QUALITY = 76;
const GIF_PREVIEW_SIZE = 160;
const GIF_PREVIEW_COLORS = 64;
const GIF_PREVIEW_EFFORT = 7;

export interface GeneratedPreview {
  buffer: Buffer;
  ext: "webp" | "gif";
}

export function previewExtFor(sourceExt: StickerExt): "webp" | "gif" {
  return sourceExt === "gif" ? "gif" : "webp";
}

export async function generateStickerPreview(
  buffer: Buffer,
  sourceExt: StickerExt,
): Promise<GeneratedPreview> {
  if (previewExtFor(sourceExt) === "gif") return generateTinyGif(buffer);
  return generateWebpPreview(buffer);
}

async function generateWebpPreview(buffer: Buffer): Promise<GeneratedPreview> {
  const preview = await sharp(buffer, { animated: false })
    .resize({
      width: WEBP_PREVIEW_SIZE,
      height: WEBP_PREVIEW_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_PREVIEW_QUALITY })
    .toBuffer();
  return { buffer: preview, ext: "webp" };
}

async function generateTinyGif(buffer: Buffer): Promise<GeneratedPreview> {
  const preview = await sharp(buffer, { animated: true })
    .resize({
      width: GIF_PREVIEW_SIZE,
      height: GIF_PREVIEW_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .gif({
      colours: GIF_PREVIEW_COLORS,
      effort: GIF_PREVIEW_EFFORT,
    })
    .toBuffer();
  return { buffer: preview, ext: "gif" };
}
