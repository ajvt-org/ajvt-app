import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const ICON_SOURCE = "public/logo-mark.svg";
export const APPLE_BACKGROUND = "#f0faf5";

export const COPIED_ICONS = ["src/app/icon.svg"];

export const RASTER_ICONS = [
  { path: "public/icon-192.png", size: 192, background: null },
  { path: "public/icon-512.png", size: 512, background: null },
  { path: "src/app/apple-icon.png", size: 180, background: APPLE_BACKGROUND },
];

export function readSource() {
  return readFileSync(join(root, ICON_SOURCE));
}

export async function drawIcon({ size, background }) {
  const drawn = sharp(readSource(), { density: 600 }).resize(size, size);
  return background ? drawn.flatten({ background }).png().toBuffer() : drawn.png().toBuffer();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const path of COPIED_ICONS) {
    copyFileSync(join(root, ICON_SOURCE), join(root, path));
    console.log(`${path} copied from ${ICON_SOURCE}`);
  }
  for (const icon of RASTER_ICONS) {
    writeFileSync(join(root, icon.path), await drawIcon(icon));
    console.log(`${icon.path} ${icon.size}x${icon.size}`);
  }
}
