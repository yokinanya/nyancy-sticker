import sharp from "sharp";

export const VISUAL_HASH_HEX_LENGTH = 16;
export const VISUAL_SIMILAR_DISTANCE = 8;

const HASH_DIMENSION = 8;
const HASH_PIXELS = HASH_DIMENSION * HASH_DIMENSION;
const HEX_PATTERN = /^[0-9a-f]{16}$/i;
const NIBBLE_BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const;

export async function generateVisualHash(buffer: Buffer): Promise<string> {
  const pixels = await sharp(buffer, { animated: false })
    .resize(HASH_DIMENSION, HASH_DIMENSION, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  if (pixels.length !== HASH_PIXELS) {
    throw new Error(`视觉哈希生成失败：期望 ${HASH_PIXELS} 个像素，实际 ${pixels.length}。`);
  }
  return pixelsToAverageHash(pixels);
}

export function visualHashDistance(left: string, right: string): number {
  assertVisualHash(left, "left");
  assertVisualHash(right, "right");
  let distance = 0;
  for (let i = 0; i < VISUAL_HASH_HEX_LENGTH; i += 1) {
    const diff = Number.parseInt(left[i], 16) ^ Number.parseInt(right[i], 16);
    distance += NIBBLE_BITS[diff];
  }
  return distance;
}

export function assertVisualHash(value: string, label = "visualHash"): void {
  if (!HEX_PATTERN.test(value)) {
    throw new Error(`${label} 必须是 ${VISUAL_HASH_HEX_LENGTH} 位十六进制视觉哈希。`);
  }
}

function pixelsToAverageHash(pixels: Buffer): string {
  const average = averagePixelValue(pixels);
  const bytes: string[] = [];
  for (let offset = 0; offset < HASH_PIXELS; offset += 8) {
    bytes.push(pixelByte(pixels, offset, average).toString(16).padStart(2, "0"));
  }
  return bytes.join("");
}

function averagePixelValue(pixels: Buffer): number {
  let total = 0;
  for (const pixel of pixels) total += pixel;
  return total / pixels.length;
}

function pixelByte(pixels: Buffer, offset: number, average: number): number {
  let byte = 0;
  for (let i = 0; i < 8; i += 1) {
    byte = (byte << 1) | (pixels[offset + i] >= average ? 1 : 0);
  }
  return byte;
}
