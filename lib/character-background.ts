import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { publicUrlFor, uploadWebp } from "@/lib/r2";

const BACKGROUND_WIDTH = 1200;
const BACKGROUND_HEIGHT = 514;
const BACKGROUND_QUALITY = 82;
const MAX_BACKGROUND_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_BACKGROUND_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export async function uploadCharacterBackground(file: File, characterId: string): Promise<string> {
  validateBackgroundFile(file);
  const source = Buffer.from(await file.arrayBuffer());
  const output = await processBackgroundImage(source);
  const hash = createHash("sha256").update(output).digest("hex").slice(0, 16);
  const key = characterBackgroundKey(characterId, hash);
  await uploadWebp(key, output);
  return publicUrlFor(key);
}

function validateBackgroundFile(file: File): void {
  if (!ALLOWED_BACKGROUND_TYPES.has(file.type)) {
    throw new Error("背景图仅支持 PNG / JPG / GIF / WebP。");
  }
  if (file.size === 0) throw new Error("背景图文件内容为空。");
  if (file.size > MAX_BACKGROUND_SIZE_BYTES) throw new Error("背景图文件过大（>8MB）。");
}

async function processBackgroundImage(source: Buffer): Promise<Buffer> {
  return sharp(source, { animated: false })
    .rotate()
    .resize({
      width: BACKGROUND_WIDTH,
      height: BACKGROUND_HEIGHT,
      fit: "cover",
      position: "center",
      withoutEnlargement: false,
    })
    .webp({ quality: BACKGROUND_QUALITY })
    .toBuffer();
}

function characterBackgroundKey(characterId: string, hash: string): string {
  return ["characters", encodeURIComponent(characterId), `background-${hash}.webp`].join("/");
}
