#!/usr/bin/env tsx
/**
 * 一次性脚本：生成 PWA 占位图标到 public/icons/
 * 用户后续可用真正的 logo 直接覆盖同名文件。
 */
import sharp from "sharp";
import path from "node:path";
import { promises as fs } from "node:fs";

const OUT = path.resolve(process.cwd(), "public/icons");

const SVG = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <text x="50%" y="50%" font-size="320" text-anchor="middle" dominant-baseline="central" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">🐱</text>
</svg>
`;

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  for (const size of [192, 512]) {
    const buf = await sharp(Buffer.from(SVG(size))).resize(size, size).png().toBuffer();
    await fs.writeFile(path.join(OUT, `icon-${size}.png`), buf);
    console.log(`✓ icon-${size}.png`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
