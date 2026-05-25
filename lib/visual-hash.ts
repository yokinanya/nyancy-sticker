import sharp from "sharp";

export const VISUAL_HASH_HEX_LENGTH = 16;
export const VISUAL_SIMILAR_DISTANCE = 8;
export const VISUAL_HASH_V2_HEX_LENGTH = 48;
export const VISUAL_SIMILAR_SCORE_V2 = 9.5;

const HASH_DIMENSION = 8;
const HASH_PIXELS = HASH_DIMENSION * HASH_DIMENSION;
const DIFFERENCE_HASH_WIDTH = 9;
const PHASH_DIMENSION = 32;
const PHASH_LOW_DIMENSION = 8;
const AVERAGE_HASH_START = 0;
const DIFFERENCE_HASH_START = 16;
const PERCEPTUAL_HASH_START = 32;
const WHITE_CHANNEL = 255;
const WHITE_HEX = "#ffffff";
const HEX_PATTERN = /^[0-9a-f]{16}$/i;
const HEX_PATTERN_V2 = /^[0-9a-f]{48}$/i;
const NIBBLE_BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const;
const PERCEPTUAL_DISTANCE_LIMIT = 10;
const DIFFERENCE_DISTANCE_LIMIT = 12;
const STRONG_AVERAGE_DISTANCE_LIMIT = 4;
const STRONG_PERCEPTUAL_DISTANCE_LIMIT = 2;
const PERCEPTUAL_WEIGHT = 0.55;
const DIFFERENCE_WEIGHT = 0.3;
const AVERAGE_WEIGHT = 0.15;
const DCT_PHASE_SCALE = 2;

export interface VisualFingerprintDistance {
  average: number;
  difference: number;
  perceptual: number;
  score: number;
}

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

export async function generateVisualHashV2(buffer: Buffer): Promise<string> {
  const [average, difference, perceptual] = await Promise.all([
    generateContainedAverageHash(buffer),
    generateDifferenceHash(buffer),
    generatePerceptualHash(buffer),
  ]);
  return `${average}${difference}${perceptual}`;
}

export function visualHashDistance(left: string, right: string): number {
  assertVisualHash(left, "left");
  assertVisualHash(right, "right");
  return hexHammingDistance(left, right);
}

export function visualFingerprintDistance(left: string, right: string): VisualFingerprintDistance {
  assertVisualHashV2(left, "left");
  assertVisualHashV2(right, "right");
  const average = visualHashDistance(
    left.slice(AVERAGE_HASH_START, DIFFERENCE_HASH_START),
    right.slice(AVERAGE_HASH_START, DIFFERENCE_HASH_START),
  );
  const difference = visualHashDistance(
    left.slice(DIFFERENCE_HASH_START, PERCEPTUAL_HASH_START),
    right.slice(DIFFERENCE_HASH_START, PERCEPTUAL_HASH_START),
  );
  const perceptual = visualHashDistance(
    left.slice(PERCEPTUAL_HASH_START),
    right.slice(PERCEPTUAL_HASH_START),
  );
  const score =
    perceptual * PERCEPTUAL_WEIGHT + difference * DIFFERENCE_WEIGHT + average * AVERAGE_WEIGHT;
  return { average, difference, perceptual, score };
}

export function isSimilarFingerprint(distance: VisualFingerprintDistance): boolean {
  if (
    distance.perceptual <= PERCEPTUAL_DISTANCE_LIMIT &&
    distance.difference <= DIFFERENCE_DISTANCE_LIMIT
  ) {
    return true;
  }
  if (
    distance.perceptual <= STRONG_PERCEPTUAL_DISTANCE_LIMIT &&
    distance.average <= STRONG_AVERAGE_DISTANCE_LIMIT
  ) {
    return true;
  }
  return distance.score <= VISUAL_SIMILAR_SCORE_V2;
}

export function assertVisualHashV2(value: string, label = "visualHashV2"): void {
  if (!HEX_PATTERN_V2.test(value)) {
    throw new Error(`${label} 必须是 ${VISUAL_HASH_V2_HEX_LENGTH} 位十六进制视觉指纹。`);
  }
}

function hexHammingDistance(left: string, right: string): number {
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

async function generateContainedAverageHash(buffer: Buffer): Promise<string> {
  const pixels = await normalizedPixels(buffer, HASH_DIMENSION, HASH_DIMENSION);
  return pixelsToAverageHash(pixels);
}

async function generateDifferenceHash(buffer: Buffer): Promise<string> {
  const pixels = await normalizedPixels(buffer, DIFFERENCE_HASH_WIDTH, HASH_DIMENSION);
  const bytes: string[] = [];
  for (let row = 0; row < HASH_DIMENSION; row += 1) {
    bytes.push(differenceByte(pixels, row).toString(16).padStart(2, "0"));
  }
  return bytes.join("");
}

async function generatePerceptualHash(buffer: Buffer): Promise<string> {
  const pixels = await normalizedPixels(buffer, PHASH_DIMENSION, PHASH_DIMENSION);
  const coefficients = lowFrequencyDct(pixels);
  const threshold = averageWithoutDc(coefficients);
  return bitsToHex(coefficients.map((value) => value >= threshold));
}

async function normalizedPixels(buffer: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .resize(width, height, {
      background: { r: WHITE_CHANNEL, g: WHITE_CHANNEL, b: WHITE_CHANNEL, alpha: 1 },
      fit: "contain",
    })
    .flatten({ background: WHITE_HEX })
    .greyscale()
    .raw()
    .toBuffer();
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

function differenceByte(pixels: Buffer, row: number): number {
  let byte = 0;
  const offset = row * DIFFERENCE_HASH_WIDTH;
  for (let col = 0; col < HASH_DIMENSION; col += 1) {
    byte = (byte << 1) | (pixels[offset + col] > pixels[offset + col + 1] ? 1 : 0);
  }
  return byte;
}

function lowFrequencyDct(pixels: Buffer): number[] {
  const coefficients: number[] = [];
  for (let v = 0; v < PHASH_LOW_DIMENSION; v += 1) {
    for (let u = 0; u < PHASH_LOW_DIMENSION; u += 1) {
      coefficients.push(dctCoefficient(pixels, u, v));
    }
  }
  return coefficients;
}

function dctCoefficient(pixels: Buffer, u: number, v: number): number {
  let sum = 0;
  for (let y = 0; y < PHASH_DIMENSION; y += 1) {
    for (let x = 0; x < PHASH_DIMENSION; x += 1) {
      sum += pixels[y * PHASH_DIMENSION + x] * dctBasis(x, y, u, v);
    }
  }
  return sum;
}

function dctBasis(x: number, y: number, u: number, v: number): number {
  const xAngle = ((DCT_PHASE_SCALE * x + 1) * u * Math.PI) / (DCT_PHASE_SCALE * PHASH_DIMENSION);
  const yAngle = ((DCT_PHASE_SCALE * y + 1) * v * Math.PI) / (DCT_PHASE_SCALE * PHASH_DIMENSION);
  return Math.cos(xAngle) * Math.cos(yAngle);
}

function averageWithoutDc(values: readonly number[]): number {
  const total = values.slice(1).reduce((sum, value) => sum + value, 0);
  return total / (values.length - 1);
}

function bitsToHex(bits: readonly boolean[]): string {
  const bytes: string[] = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    bytes.push(bitByte(bits, offset).toString(16).padStart(2, "0"));
  }
  return bytes.join("");
}

function bitByte(bits: readonly boolean[], offset: number): number {
  let byte = 0;
  for (let i = 0; i < 8; i += 1) byte = (byte << 1) | (bits[offset + i] ? 1 : 0);
  return byte;
}
