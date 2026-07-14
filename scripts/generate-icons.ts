#!/usr/bin/env tsx

import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";

const ROOT = process.cwd();
const ICON_DIRECTORY = path.join(ROOT, "public", "icons");
const FAVICON_SIZE = 64;
const PNG_COMPRESSION_LEVEL = 9;
const SOURCE_ICON = path.join(ICON_DIRECTORY, "icon-192.png");
const OPTIMIZED_ICONS = [
  SOURCE_ICON,
  path.join(ICON_DIRECTORY, "icon-512.png"),
  path.join(ROOT, "app", "apple-icon.png"),
] as const;

async function optimizePng(filePath: string): Promise<void> {
  const input = await fs.readFile(filePath);
  const output = await sharp(input)
    .png({ adaptiveFiltering: true, compressionLevel: PNG_COMPRESSION_LEVEL })
    .toBuffer();
  await fs.writeFile(filePath, output);
  console.log(`✓ ${path.relative(ROOT, filePath)}`);
}

async function createFavicon(): Promise<void> {
  const source = await fs.readFile(SOURCE_ICON);
  const output = await sharp(source)
    .resize(FAVICON_SIZE, FAVICON_SIZE)
    .png({ adaptiveFiltering: true, compressionLevel: PNG_COMPRESSION_LEVEL })
    .toBuffer();
  const favicon = path.join(ICON_DIRECTORY, `favicon-${FAVICON_SIZE}.png`);
  await fs.writeFile(favicon, output);
  console.log(`✓ ${path.relative(ROOT, favicon)}`);
}

async function main(): Promise<void> {
  await Promise.all(OPTIMIZED_ICONS.map(optimizePng));
  await createFavicon();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
