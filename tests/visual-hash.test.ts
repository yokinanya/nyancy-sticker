import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  VISUAL_SIMILAR_DISTANCE,
  generateVisualHash,
  generateVisualHashV2,
  isSimilarFingerprint,
  visualFingerprintDistance,
  visualHashDistance,
} from "../lib/visual-hash";

test("visualHashDistance returns zero for identical images", async () => {
  const image = await patternedImage("left");
  const hash = await generateVisualHash(image);
  assert.equal(visualHashDistance(hash, hash), 0);
});

test("visual hash stays close after resize and format conversion", async () => {
  const image = await patternedImage("left");
  const converted = await sharp(image).resize(32, 32).webp({ quality: 72 }).toBuffer();
  const distance = visualHashDistance(
    await generateVisualHash(image),
    await generateVisualHash(converted),
  );
  assert.ok(distance <= VISUAL_SIMILAR_DISTANCE);
});

test("visualHashV2 returns zero distance for identical images", async () => {
  const image = await patternedImage("left");
  const hash = await generateVisualHashV2(image);
  const distance = visualFingerprintDistance(hash, hash);

  assert.equal(distance.average, 0);
  assert.equal(distance.difference, 0);
  assert.equal(distance.perceptual, 0);
  assert.equal(distance.score, 0);
});

test("visualHashV2 stays similar after resize and format conversion", async () => {
  const image = await patternedImage("left");
  const converted = await sharp(image).resize(32, 32).webp({ quality: 72 }).toBuffer();
  const distance = visualFingerprintDistance(
    await generateVisualHashV2(image),
    await generateVisualHashV2(converted),
  );

  assert.ok(isSimilarFingerprint(distance));
});

test("visual hash separates mirrored patterns", async () => {
  const left = await generateVisualHash(await patternedImage("left"));
  const right = await generateVisualHash(await patternedImage("right"));
  assert.ok(visualHashDistance(left, right) > VISUAL_SIMILAR_DISTANCE);
});

test("visualHashV2 separates mirrored patterns", async () => {
  const left = await generateVisualHashV2(await patternedImage("left"));
  const right = await generateVisualHashV2(await patternedImage("right"));
  assert.equal(isSimilarFingerprint(visualFingerprintDistance(left, right)), false);
});

test("visualHashDistance rejects invalid hash values", () => {
  assert.throws(() => visualHashDistance("bad", "0000000000000000"), /16 位十六进制/);
});

test("visualFingerprintDistance rejects invalid hash values", () => {
  assert.throws(
    () => visualFingerprintDistance("bad", "000000000000000000000000000000000000000000000000"),
    /48 位十六进制/,
  );
});

function patternedImage(side: "left" | "right"): Promise<Buffer> {
  const x = side === "left" ? 0 : 16;
  const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="black"/>
      <rect x="${x}" y="0" width="16" height="32" fill="white"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
