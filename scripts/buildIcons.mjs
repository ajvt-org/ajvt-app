import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const INSTALLED_ICON_SOURCE = "public/logo-roundel.svg";
export const APPLE_BACKGROUND = "#f0faf5";

export const APP_MARKS = ["public/logo-mark.svg", "public/logo-roundel.svg"];

export const RASTER_ICONS = [
  { path: "public/icon-192.png", size: 192, background: null },
  { path: "public/icon-512.png", size: 512, background: null },
  { path: "src/app/apple-icon.png", size: 180, background: APPLE_BACKGROUND },
];

export async function drawIcon({ size, background }) {
  const source = readFileSync(join(root, INSTALLED_ICON_SOURCE));
  const drawn = sharp(source, { density: 600 }).resize(size, size);
  return background ? drawn.flatten({ background }).png().toBuffer() : drawn.png().toBuffer();
}

export async function inkBounds(path, canvas = 400) {
  const { data, info } = await sharp(join(root, path), { density: 600 })
    .resize(canvas, canvas)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const bounds = { top: canvas, left: canvas, bottom: -1, right: -1 };
  for (let y = 0; y < canvas; y++) {
    for (let x = 0; x < canvas; x++) {
      if (alpha(x, y) <= 8) continue;
      bounds.top = Math.min(bounds.top, y);
      bounds.left = Math.min(bounds.left, x);
      bounds.bottom = Math.max(bounds.bottom, y);
      bounds.right = Math.max(bounds.right, x);
    }
  }
  return bounds;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const icon of RASTER_ICONS) {
    writeFileSync(join(root, icon.path), await drawIcon(icon));
    console.log(`${icon.path} ${icon.size}x${icon.size}`);
  }
}
